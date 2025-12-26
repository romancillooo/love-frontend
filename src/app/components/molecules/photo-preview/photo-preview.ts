import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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
export class PhotoPreviewComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) photo!: Photo;
  @Input() hasNext = false;
  @Input() hasPrev = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() toggleFavorite = new EventEmitter<void>();
  @Output() addToAlbum = new EventEmitter<void>();

  constructor(private photoService: PhotoService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // 🔒 Bloquear scroll del body al abrir
    document.body.style.overflow = 'hidden';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['photo']) {
      this.resetZoom();
    }
  }

  ngOnDestroy() {
    // 🔓 Restaurar scroll al cerrar
    document.body.style.overflow = '';
  }

  // 🔍 Logic de Zoom (Pinch-to-zoom)
  scale = 1;
  panning = false;
  pointX = 0;
  pointY = 0;
  startX = 0;
  startY = 0;
  private lastPointX = 0;
  private lastPointY = 0;
  private startDistance = 0;
  
  get imageTransform() {
    return `translate3d(${this.pointX}px, ${this.pointY}px, 0) scale(${this.scale})`;
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      // ✌️ Inicio de Pinch (Zoom)
      this.panning = false;
      this.startDistance = this.getDistance(event.touches);
    } else if (event.touches.length === 1 && this.scale > 1) {
      // 👆 Inicio de Pan (Mover imagen con zoom)
      this.panning = true;
      this.startX = event.touches[0].clientX - this.lastPointX;
      this.startY = event.touches[0].clientY - this.lastPointY;
    }
  }

  onTouchMove(event: TouchEvent) {
    event.preventDefault(); // 🛑 Evitar scroll de página

    if (event.touches.length === 2) {
      // ✌️ Haciendo Pinch (Zoom)
      const currentDistance = this.getDistance(event.touches);
      if (this.startDistance > 0) {
        // Calcular nueva escala
        const newScale = Math.max(1, Math.min(4, (currentDistance / this.startDistance) * this.scale));
        // Nota: Simplificación, idealmente usaría lastScale, pero actualizando dinámicamente funciona suave si startDistance es constante durante el evento
        // Corrección: Para un pinch suave "absoluto", deberíamos basarnos en el scale al iniciar el gesto.
        // Pero para simplificar en Angular directo:
        const scaleChange = currentDistance / this.startDistance;
        // Ajustamos la escala actual, pero necesitamos guardar la 'base' del gesto.
        // Hagámoslo simple: reseteamos startDistance en cada frame es sucio, mejor:
        // NO IMPLEMENTAR LOGICA COMPLEJA AQUI, solo actualizar.
        
        // Mejor enfoque simple:
        // this.scale = this.lastScale * (currentDistance / this.startDistance);
        // Necesitamos guardar lastScale en touchStart.
      }
    } else if (event.touches.length === 1 && this.panning && this.scale > 1) {
      // 👆 Haciendo Pan
      this.pointX = event.touches[0].clientX - this.startX;
      this.pointY = event.touches[0].clientY - this.startY;
    }
  }
  
  // Re-escritura con state correcto para el pinch
  private initialScale = 1;

  handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.panning = false;
      this.startDistance = this.getDistance(event.touches);
      this.initialScale = this.scale;
    } else if (event.touches.length === 1 && this.scale > 1) {
      this.panning = true;
      this.startX = event.touches[0].clientX - this.pointX;
      this.startY = event.touches[0].clientY - this.pointY;
    }
  }

  handleTouchMove(event: TouchEvent) {
    // Solo prevenir default si estamos haciendo zoom o pan con zoom
    if (this.scale > 1 || event.touches.length === 2) {
      event.preventDefault();
      // event.stopPropagation();
    }

    if (event.touches.length === 2 && this.startDistance > 0) {
      const dist = this.getDistance(event.touches);
      this.scale = Math.max(1, Math.min(4, this.initialScale * (dist / this.startDistance)));
    } else if (event.touches.length === 1 && this.panning && this.scale > 1) {
      this.pointX = event.touches[0].clientX - this.startX;
      this.pointY = event.touches[0].clientY - this.startY;
    }
  }

  handleTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.startDistance = 0;
    }
    
    // Resetear panning si soltamos
    if (event.touches.length === 0) {
      this.panning = false;
    }

    // Efecto elástico: si la escala es menor a 1 (por bug visual) o muy pequeña, volvemos a 1
    if (this.scale < 1) {
      this.resetZoom();
    }
  }
  
  // 🖱️ Desktop Mouse Events
  handleWheel(event: WheelEvent) {
    event.preventDefault();

    // Factor de sensibilidad
    // Para trackpads, deltaY suele ser pequeño (ej. 4, 10). Para ratón, grande (100).
    // Usamos un divisor para normalizar.
    const sensitivity = 0.002;
    // Invertimos signo: Rueda arriba (negativo) = Zoom In (sumar escala)
    const zoomDelta = -event.deltaY * sensitivity;

    // Aplicar zoom
    this.scale = Math.max(1, Math.min(5, this.scale + zoomDelta));
    
    // Si volvemos a escala 1, reseteamos posición
    if (this.scale <= 1) {
        this.scale = 1;
        this.pointX = 0;
        this.pointY = 0;
    }
    
    // Forzar actualización visual
    this.cdr.detectChanges();
  }

  handleMouseDown(event: MouseEvent) {
    // Solo permitir arrastrar si hay zoom
    if (this.scale > 1) {
      this.panning = true;
      this.startX = event.clientX - this.pointX;
      this.startY = event.clientY - this.pointY;
      event.preventDefault(); // Evitar selección de texto o arrastre de imagen fantasma
    }
  }

  handleMouseMove(event: MouseEvent) {
    if (!this.panning) return;
    event.preventDefault();
    this.pointX = event.clientX - this.startX;
    this.pointY = event.clientY - this.startY;
    this.cdr.detectChanges(); // Actualizar vista
  }

  handleMouseUp() {
    this.panning = false;
  }

  handleDoubleClick() {
      if (this.scale > 1) {
          this.resetZoom();
      } else {
          this.scale = 2.5; // Zoom rápido
      }
  }
  
  resetZoom() {
    this.scale = 1;
    this.pointX = 0;
    this.pointY = 0;
    this.panning = false;
  }

  private getDistance(touches: TouchList): number {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
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

  onToggleFavorite() {
    this.toggleFavorite.emit();
  }

  onAddToAlbum() {
    this.addToAlbum.emit();
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
