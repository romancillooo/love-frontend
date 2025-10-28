// src/app/components/organisms/album-creator/album-creator.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Album } from '../../../core/models/album';

@Component({
  selector: 'app-album-creator',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './album-creator.html',
  styleUrls: ['./album-creator.scss'],
})
export class AlbumCreatorComponent {
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{ name: string; description: string }>();
  @Output() update = new EventEmitter<{ id: string; name: string; description: string }>();
  @Output() remove = new EventEmitter<string>();

  private _initialAlbum: Album | null = null;

  @Input()
  set initialAlbum(value: Album | null) {
    this._initialAlbum = value ?? null;
    if (this._initialAlbum) {
      this.populateFromAlbum(this._initialAlbum);
    } else {
      this.resetForm();
    }
  }

  get initialAlbum(): Album | null {
    return this._initialAlbum;
  }

  albumName = '';
  albumDescription = '';
  isSubmitting = false;
  isDeleting = false;

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.albumName.trim()) {
      return;
    }

    this.isSubmitting = true;

    // Emitir datos del álbum
    const payload = {
      name: this.albumName.trim(),
      description: this.albumDescription.trim(),
    };

    if (this.isEditMode && this._initialAlbum) {
      this.update.emit({ id: this._initialAlbum.id, ...payload });
    } else {
      this.create.emit(payload);
      this.resetForm();
    }

    this.isSubmitting = false;
  }

  onRemove() {
    if (!this._initialAlbum) {
      return;
    }
    this.remove.emit(this._initialAlbum.id);
  }

  get isValid(): boolean {
    return this.albumName.trim().length > 0;
  }

  get isEditMode(): boolean {
    return !!this._initialAlbum;
  }

  get submitLabel(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Guardando...' : 'Creando...';
    }
    return this.isEditMode ? 'Guardar cambios' : 'Crear Álbum';
  }

  get submitIcon(): string {
    return this.isEditMode ? 'save' : 'add_photo_alternate';
  }

  get deleteLabel(): string {
    return this.isDeleting ? 'Eliminando...' : 'Eliminar álbum';
  }

  private populateFromAlbum(album: Album) {
    this.albumName = album.name ?? '';
    this.albumDescription = album.description ?? '';
    this.isSubmitting = false;
    this.isDeleting = false;
  }

  private resetForm() {
    this.albumName = '';
    this.albumDescription = '';
    this.isSubmitting = false;
    this.isDeleting = false;
    this._initialAlbum = null;
  }
}
