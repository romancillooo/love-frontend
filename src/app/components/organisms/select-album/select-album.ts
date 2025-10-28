import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { Album } from '../../../core/models/album';
import { AlbumService } from '../../../core/services/album.service';
import { LoveLoaderComponent } from '../../shared/love-loader/love-loader';

@Component({
  selector: 'app-select-album',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoveLoaderComponent],
  templateUrl: './select-album.html',
  styleUrls: ['./select-album.scss'],
})
export class SelectAlbumComponent implements OnInit, OnDestroy {
  @Input() photoId: string | null = null; // 🔹 ID de la foto para pre-seleccionar álbumes
  @Input() photoLabel?: string;
  @Input() isBusy = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ toAdd: string[]; toRemove: string[] }>();

  albums: Album[] = [];
  selectedAlbumIds = new Set<string>();
  initialAlbumIds = new Set<string>(); // 🔹 Álbumes pre-seleccionados inicialmente
  isLoading = true;
  errorMessage = '';

  private subscription?: Subscription;

  constructor(private readonly albumService: AlbumService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subscription = this.albumService.getAllAlbums().subscribe({
      next: (albums) => {
        this.albums = albums;
        this.isLoading = false;
        this.errorMessage = albums.length === 0 ? 'Aún no tienes álbumes creados.' : '';

        // 🔹 Pre-seleccionar álbumes que ya contienen esta foto
        if (this.photoId) {
          this.preselectAlbums(this.photoId);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error loading albums:', err);
        this.errorMessage = 'No pude cargar tus álbumes. Inténtalo más tarde.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  onBackdropClick() {
    this.clearSelection();
    this.close.emit();
  }

  onModalClick(event: MouseEvent) {
    event.stopPropagation();
  }

  toggleSelection(album: Album) {
    const id = album.id;
    if (!id) return;
    if (this.selectedAlbumIds.has(id)) {
      this.selectedAlbumIds.delete(id);
    } else {
      this.selectedAlbumIds.add(id);
    }
    this.cdr.detectChanges();
  }

  isSelected(albumId: string | undefined) {
    return albumId ? this.selectedAlbumIds.has(albumId) : false;
  }

  clearSelection() {
    this.selectedAlbumIds.clear();
    this.initialAlbumIds.clear(); // 🔹 Limpiar también la selección inicial
    this.cdr.detectChanges();
  }

  onConfirm() {
    // 🔹 Calcular qué álbumes agregar y cuáles eliminar
    const currentSelection = Array.from(this.selectedAlbumIds);
    const initialSelection = Array.from(this.initialAlbumIds);

    const toAdd = currentSelection.filter((id) => !this.initialAlbumIds.has(id));
    const toRemove = initialSelection.filter((id) => !this.selectedAlbumIds.has(id));

    // 🔹 Emitir solo si hay cambios
    if (toAdd.length > 0 || toRemove.length > 0) {
      this.confirm.emit({ toAdd, toRemove });
    }

    this.clearSelection();
  }

  /**
   * 🔹 Pre-seleccionar álbumes que ya contienen la foto
   */
  private preselectAlbums(photoId: string) {
    this.albums.forEach((album) => {
      if (album.photoIds.includes(photoId)) {
        this.selectedAlbumIds.add(album.id);
        this.initialAlbumIds.add(album.id); // 🔹 Guardar selección inicial
      }
    });
  }
}
