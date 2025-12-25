import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Photo } from '../../../core/models/photo';
import { PhotoService } from '../../../core/services/photo.service';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './photo-preview.html',
  styleUrls: ['./photo-preview.scss'],
})
export class PhotoPreviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) photo!: Photo;
  @Input() hasNext = false;
  @Input() hasPrev = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  constructor(private photoService: PhotoService) {}

  ngOnInit() {
    // 🔒 Bloquear scroll del body al abrir
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    // 🔓 Restaurar scroll al cerrar
    document.body.style.overflow = '';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && this.hasNext) {
      this.next.emit();
    }
    if (event.key === 'ArrowLeft' && this.hasPrev) {
      this.prev.emit();
    }
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  onClose() {
    this.close.emit();
  }

  onDelete() {
    this.delete.emit();
  }

  async downloadImage() {
    if (!this.photo.id) return;
    
    try {
      // 1. Usar el servicio para descargar el Blob desde el backend
      const blob = await firstValueFrom(this.photoService.downloadPhoto(this.photo.id));
      
      // 2. Crear URL del objeto
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 3. Crear link temporal y simular click
      const link = document.createElement('a');
      link.href = blobUrl;
      // Usar título o ID para el nombre de archivo
      const filename = this.photo.description || `recuerdo-${this.photo.id}`;
      // El backend debería enviar el Content-Type correcto, pero asumimos jpg o usamos el del blob si se pudiera leer
      link.download = filename.endsWith('.jpg') || filename.endsWith('.png') ? filename : `${filename}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 4. Revocar URL para liberar memoria
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image via service:', error);
      // Fallback: intentar abrir la URL directa si falla el servicio
      if (this.photo.large || this.photo.small) {
        window.open(this.photo.large || this.photo.small, '_blank');
      }
    }
  }
}
