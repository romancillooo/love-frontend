// src/app/components/atoms/photo-card/photo-card.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Photo } from '../../../core/models/photo';
import { PhotoService } from '../../../core/services/photo.service';
import { LoveLoaderService } from '../../../core/services/love-loader.service';

@Component({
  selector: 'app-photo-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './photo-card.html',
  styleUrls: ['./photo-card.scss'],
})
export class PhotoCardComponent {
  @Input() photo!: Photo;
  @Output() openPreview = new EventEmitter<Photo>();
  @Output() imageLoaded = new EventEmitter<string>();

  randomRotation = 0;
  cardTransform = 'rotate(0deg)';
  private hasEmittedLoad = false;
  isDownloading = false;

  constructor(
    private readonly photoService: PhotoService,
    private readonly loaderService: LoveLoaderService,
  ) {}

  ngOnInit() {
    // Rotación aleatoria para dar ese efecto "desordenado" playful.
    const range = this.getRotationRange();
    this.randomRotation = Math.round(Math.random() * (range * 2)) - range;
    this.cardTransform = `rotate(${this.randomRotation}deg)`;
  }

  onClick() {
    this.openPreview.emit(this.photo);
  }

  onImageLoad() {
    if (!this.hasEmittedLoad) {
      this.hasEmittedLoad = true;
      this.imageLoaded.emit(this.photo.id);
    }
  }

  onDownload(event: Event) {
    event.stopPropagation(); // Evitar que se abra el preview
    if (this.isDownloading) return;

    this.isDownloading = true;
    this.loaderService.show('Preparando tu descarga...');

    this.photoService.downloadPhoto(this.photo.id).subscribe({
      next: (blob) => {
        // Crear un enlace temporal para descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Usar el nombre original o generar uno basado en la fecha
        const fileName = this.photo.description ||
          `love-memory-${new Date(this.photo.createdAt).toISOString().split('T')[0]}.jpg`;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.isDownloading = false;
        this.loaderService.hide();
      },
      error: (err) => {
        console.error('❌ Error al descargar:', err);
        this.isDownloading = false;
        this.loaderService.hide();
      },
    });
  }

  private getRotationRange(): number {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      return 1; // rotaciones suaves en móvil
    }
    return 3;
  }
}
