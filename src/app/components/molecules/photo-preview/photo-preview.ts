// src/app/components/molecules/photo-preview/photo-preview.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Photo } from '../../../core/models/photo';
import { PhotoService } from '../../../core/services/photo.service';
import { LoveLoaderService } from '../../../core/services/love-loader.service';
import { LoveLoaderComponent } from '../../shared/love-loader/love-loader';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoveLoaderComponent],
  templateUrl: './photo-preview.html',
  styleUrls: ['./photo-preview.scss'],
})
export class PhotoPreviewComponent implements OnChanges, OnDestroy {
  @Input() photo: Photo | null = null;
  @Input() hasNext = false;
  @Input() hasPrevious = false;
  @Input() index = 0;
  @Input() total = 0;
  @Input() showActions = true; // 🔹 Controla si se muestran botones de favorito/eliminar
  @Input() albumContextId: string | null = null;
  @Input() albumContextName?: string;

  @Output() close = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() requestDelete = new EventEmitter<string>();
  @Output() toggleFavorite = new EventEmitter<string>(); // ❤️ evento para alternar favorito
  @Output() requestAddToAlbum = new EventEmitter<{ id: string; label?: string }>();
  @Output() requestRemoveFromAlbum = new EventEmitter<{
    photoId: string;
    albumId: string;
    albumName?: string;
  }>();
  @Input() isRemoveFromAlbumBusy = false;

  isDownloading = false; // 💾 control de estado de descarga
  showOptionsMenu = false;

  private preventScroll = (e: TouchEvent) => e.preventDefault();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly photoService: PhotoService,
    private readonly loaderService: LoveLoaderService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['photo']) {
      if (this.photo) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('touchmove', this.preventScroll, { passive: false });
      } else {
        this.restoreScroll();
      }
    }
  }

  onClose() {
    this.closeOptionsMenu();
    this.close.emit();
    this.restoreScroll();
  }

  onNext() {
    if (this.hasNext) this.next.emit();
  }

  onPrevious() {
    if (this.hasPrevious) this.previous.emit();
  }

  onModalClick(event: MouseEvent) {
    event.stopPropagation();
    this.closeOptionsMenu();
  }

  // 🔹 Abre el modal de confirmación
  onDelete() {
    if (!this.photo) return;
    this.closeOptionsMenu();
    this.requestDelete.emit(this.photo.id);
  }

  onAddToAlbum() {
    if (!this.photo) return;
    this.closeOptionsMenu();
    this.requestAddToAlbum.emit({ id: this.photo.id, label: this.photo.description });
  }

  onRemoveFromAlbum() {
    if (!this.photo || !this.albumContextId) return;
    this.closeOptionsMenu();
    this.requestRemoveFromAlbum.emit({
      photoId: this.photo.id,
      albumId: this.albumContextId,
      albumName: this.albumContextName,
    });
  }

  // ❤️ Alternar favorito
  onToggleFavorite() {
    if (!this.photo) return;
    this.toggleFavorite.emit(this.photo.id);
  }

  // 💾 Descargar foto
  onDownload() {
    if (!this.photo || this.isDownloading) return;

    this.closeOptionsMenu();

    this.isDownloading = true;
    this.loaderService.show('Preparando tu descarga...');

    this.photoService.downloadPhoto(this.photo.id).subscribe({
      next: (blob) => {
        // Crear un enlace temporal para descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Usar el nombre original o generar uno basado en la fecha
    const baseName =
      (this.photo?.description && this.photo.description.replace(/\.(webp|jpg|jpeg|gif|avif|heic|heif|png)$/i, '')) ||
      `love-memory-${new Date(this.photo!.createdAt).toISOString().split('T')[0]}`;
    link.download = `${baseName}.png`;

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

  toggleOptionsMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showOptionsMenu = !this.showOptionsMenu;
    this.cdr.detectChanges();
  }

  closeOptionsMenu() {
    if (this.showOptionsMenu) {
      this.showOptionsMenu = false;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.photo) return;

    switch (event.key) {
      case 'ArrowRight':
        this.onNext();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.onPrevious();
        event.preventDefault();
        break;
      case 'Escape':
        this.onClose();
        event.preventDefault();
        break;
    }
  }

  @HostListener('document:click')
  handleDocumentClick() {
    this.closeOptionsMenu();
  }

  ngOnDestroy() {
    this.restoreScroll();
  }

  private restoreScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.removeEventListener('touchmove', this.preventScroll);
  }
}
