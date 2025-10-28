// src/app/components/organisms/photo-gallery/photo-gallery.ts
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { asyncScheduler, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, filter, finalize, observeOn, takeUntil } from 'rxjs/operators';

import { Photo } from '../../../core/models/photo';
import { PhotoService } from '../../../core/services/photo.service';
import { Album } from '../../../core/models/album';
import { AlbumService } from '../../../core/services/album.service';
import { PhotoCardComponent } from '../../atoms/photo-card/photo-card';
import { PhotoPreviewComponent } from '../../molecules/photo-preview/photo-preview';
import { LoveLoaderComponent } from '../../shared/love-loader/love-loader';
import { AlbumCreatorComponent } from '../album-creator/album-creator';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';
import { SelectAlbumComponent } from '../select-album/select-album';

type GalleryFilter = 'all' | 'favorites' | `album:${string}`;

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [
    CommonModule,
    PhotoCardComponent,
    PhotoPreviewComponent,
    LoveLoaderComponent,
    AlbumCreatorComponent,
    ConfirmDialogComponent,
    SelectAlbumComponent,
  ],
  templateUrl: './photo-gallery.html',
  styleUrls: ['./photo-gallery.scss'],
})
export class PhotoGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly skeletonPlaceholders = Array.from({ length: 6 }, (_, index) => index);

  private allPhotos: Photo[] = [];
  photos: Photo[] = [];
  albums: Album[] = [];
  activeFilter: GalleryFilter = 'all'; // Filtro activo: todos, favoritos, año específico o álbum
  currentAlbumId: string | null = null;
  currentAlbumName?: string;

  selectedPhoto: Photo | null = null;
  selectedIndex = -1;

  showAlbumCreator = false;
  albumBeingEdited: Album | null = null;
  confirmDeleteVisible = false;
  confirmPhotoDeleteVisible = false;
  photoPendingDeletion: string | null = null;
  showSelectAlbumModal = false;
  photoIdForAlbum: string | null = null;
  photoLabelForAlbum?: string;
  albumIdForRemoval: string | null = null;
  albumNameForRemoval?: string;
  confirmRemoveFromAlbumVisible = false;
  isAddToAlbumLoading = false;
  isRemoveFromAlbumLoading = false;

  private readonly globalLoadedPhotoIds = new Set<string>();
  isSkeletonVisible = true;
  loadError = '';

  isLoaderVisible = false;
  loaderMessage = '';

  private navSub?: Subscription;
  private rafId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly photoService: PhotoService,
    private readonly albumService: AlbumService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly router: Router,
    private readonly scroller: ViewportScroller,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  // ========================================================
  // 🔹 Ciclo de vida
  // ========================================================
  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // 🔁 Refrescar galería cuando PhotoService emita refresh$
    this.photoService.refresh$
      .pipe(
        observeOn(asyncScheduler), // 🔹 Evita ExpressionChangedAfterItHasBeenCheckedError
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // 🔹 Si estás en favoritos y subes fotos, cambiar a "Todos"
        if (this.activeFilter === 'favorites') {
          this.activeFilter = 'all';
        }
        this.bootstrapPhotos(true);
      });

    this.albumService.refresh$
      .pipe(
        observeOn(asyncScheduler),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.bootstrapPhotos();
      });

    // 🔹 Scroll al volver a /photos
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects.includes('/photos')) {
          this.forceScrollTop();
        }
      });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.forceScrollTop();
    this.bootstrapPhotos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.navSub?.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ========================================================
  // 🔹 Navegación
  // ========================================================
  get hasNextPhoto(): boolean {
    return this.selectedIndex < this.photos.length - 1;
  }
  get hasPreviousPhoto(): boolean {
    return this.selectedIndex > 0;
  }

  // ========================================================
  // 🔹 Contadores para filtros
  // ========================================================
  get favoritesCount(): number {
    return this.allPhotos.filter((photo) => photo.isFavorite === true).length;
  }

  get shouldEnableFilterScroll(): boolean {
    return 2 + this.albums.length > 3;
  }

  openPreview(photo: Photo) {
    this.selectedIndex = this.photos.findIndex((p) => p.id === photo.id);
    this.selectedPhoto = this.photos[this.selectedIndex] ?? null;

    // 🔹 Forzar detección de cambios para asegurar que el preview se muestre
    this.cdr.detectChanges();
  }

  closePreview() {
    this.selectedPhoto = null;
    this.selectedIndex = -1;
    this.cancelAlbumSelection();
    this.cancelPhotoRemoval();
    this.cdr.detectChanges();
  }

  showNextPhoto() {
    if (!this.hasNextPhoto) return;
    this.selectedIndex++;
    this.selectedPhoto = this.photos[this.selectedIndex];
    this.cdr.detectChanges();
  }

  showPreviousPhoto() {
    if (!this.hasPreviousPhoto) return;
    this.selectedIndex--;
    this.selectedPhoto = this.photos[this.selectedIndex];
    this.cdr.detectChanges();
  }

  // ========================================================
  // 🔹 Eventos de carga de imágenes (fix para tu error)
  // ========================================================
  onPhotoLoaded(photoId: string) {
    this.globalLoadedPhotoIds.add(photoId);
    this.evaluateSkeletonState();
  }

  hasPhotoLoaded(photoId: string): boolean {
    return this.globalLoadedPhotoIds.has(photoId);
  }

  // ========================================================
  // 🔹 Filtrado
  // ========================================================
  applyFilter(filter: GalleryFilter) {
    if (this.activeFilter === filter) return;

    if (this.showAlbumCreator && !this.isAlbumFilter(filter)) {
      this.closeAlbumEditor();
    }

    this.activeFilter = filter;
    this.currentAlbumId = this.isAlbumFilter(filter) ? this.extractAlbumId(filter as `album:${string}`) : null;
    this.currentAlbumName = this.currentAlbumId
      ? this.albums.find((album) => album.id === this.currentAlbumId)?.name
      : undefined;
    this.updateFilteredPhotos();
    if (isPlatformBrowser(this.platformId)) this.forceScrollTop();
    this.cdr.detectChanges();
  }

  applyAlbumFilter(albumId: string) {
    const targetFilter = this.buildAlbumFilter(albumId);

    if (this.activeFilter === targetFilter) {
      const album = this.albums.find((item) => item.id === albumId);
      if (album) {
        this.openAlbumEditor(album);
      }
      return;
    }

    if (this.showAlbumCreator) {
      this.closeAlbumEditor();
    }

    this.applyFilter(targetFilter);
  }

  isAlbumActive(albumId: string): boolean {
    return this.activeFilter === this.buildAlbumFilter(albumId);
  }

  onRequestPhotoDelete(photoId: string) {
    this.photoPendingDeletion = photoId;
    this.confirmPhotoDeleteVisible = true;
  }

  isAlbumSelectedWithoutPhotos(): boolean {
    if (!this.isAlbumFilter(this.activeFilter)) return false;
    const albumId = this.extractAlbumId(this.activeFilter);
    const album = this.albums.find((item) => item.id === albumId);
    return !album || (album.photoIds?.length ?? 0) === 0;
  }

  // ========================================================
  // 🔹 Carga inicial
  // ========================================================
  private bootstrapPhotos(forceRefresh = false) {
    const isInitialLoad = this.photos.length === 0;
    if (isInitialLoad) this.isSkeletonVisible = true; // solo muestra skeletons si no había nada

    this.loadError = '';

    forkJoin({
      photos: this.photoService.getAllPhotos(forceRefresh).pipe(
        catchError((error) => {
          this.loadError = this.resolveError(error);
          return of<Photo[]>([]);
        }),
      ),
      albums: this.albumService
        .getAllAlbums(forceRefresh)
        .pipe(
          catchError((error) => {
            console.error('❌ Error al obtener álbumes:', error);
            return of<Album[]>([]);
          }),
        ),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoaderVisible = false;
          this.loaderMessage = '';
        }),
      )
      .subscribe(({ photos, albums }) => {
        this.allPhotos = photos;
        this.albums = albums;

        if (this.albumBeingEdited) {
          const refreshedAlbum = albums.find((item) => item.id === this.albumBeingEdited?.id);
          if (refreshedAlbum) {
        this.albumBeingEdited = refreshedAlbum;
        this.currentAlbumName =
          this.currentAlbumId && this.currentAlbumId === refreshedAlbum.id ? refreshedAlbum.name : this.currentAlbumName;
      } else {
        this.closeAlbumEditor();
      }
    }

    if (this.isAlbumFilter(this.activeFilter)) {
      const activeAlbumId = this.extractAlbumId(this.activeFilter);
      const stillExists = this.albums.some((album) => album.id === activeAlbumId);
      if (!stillExists) {
        this.activeFilter = 'all';
        this.currentAlbumId = null;
        this.currentAlbumName = undefined;
      }
    }

        // 🔹 Si hay fotos, aplicar estrategia de carga según el contexto
        if (photos.length > 0) {
          if (forceRefresh || isInitialLoad) {
            // Refresh forzado o carga inicial: marcar TODAS las fotos como cargadas
            // ya que vienen del servidor y están disponibles para mostrarse
            this.globalLoadedPhotoIds.clear();
            photos.forEach(photo => this.globalLoadedPhotoIds.add(photo.id));
          } else {
            // 🔹 Navegación/filtrado: Mantener las IDs de fotos que ya estaban cargadas
            const previouslyLoadedIds = new Set<string>();
            photos.forEach(photo => {
              if (this.globalLoadedPhotoIds.has(photo.id)) {
                previouslyLoadedIds.add(photo.id);
              }
            });
            this.globalLoadedPhotoIds.clear();
            previouslyLoadedIds.forEach(id => this.globalLoadedPhotoIds.add(id));
          }
        } else {
          // 🔹 Sin fotos: limpiar todo
          this.globalLoadedPhotoIds.clear();
        }

        // 🔹 Aplicar el filtro activo para actualizar this.photos según corresponda
        this.updateFilteredPhotos();

        this.evaluateSkeletonState();

        // 🔹 Forzar detección de cambios para asegurar que la vista se actualice
        this.cdr.detectChanges();
      });
  }

  // ========================================================
  // 🗑️ Eliminar foto
  // ========================================================
  onDeletePhoto(photoId: string) {
    if (!photoId) return;

    // 🔹 Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.isLoaderVisible = true;
      this.loaderMessage = 'Eliminando recuerdo...';
      this.cdr.detectChanges();
    });

    this.photoService.deletePhoto(photoId).subscribe({
      next: () => {
        this.photos = this.photos.filter((p) => p.id !== photoId);
        this.allPhotos = this.allPhotos.filter((p) => p.id !== photoId);
        this.globalLoadedPhotoIds.delete(photoId); // 🔹 Remover del Set de cargadas
        this.closePreview();

        // 🔹 Reevaluar estado de skeletons (importante para cuando se eliminan todas)
        this.evaluateSkeletonState();

        this.isLoaderVisible = false;
        this.loaderMessage = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoaderVisible = false;
        this.loaderMessage = '';
        console.error('Error al eliminar la foto:', err);
        this.cdr.detectChanges();
      },
    });
  }

  // ========================================================
  // ❤️ Alternar favorito
  // ========================================================
  onToggleFavorite(photoId: string) {
    if (!photoId) return;

    // 🔹 Buscar la foto en allPhotos (fuente de verdad)
    const photoInAll = this.allPhotos.find((p) => p.id === photoId);
    const photoInFiltered = this.photos.find((p) => p.id === photoId);

    if (!photoInAll) return;

    const newFavoriteState = !photoInAll.isFavorite;

    this.photoService.toggleFavorite(photoId, newFavoriteState).subscribe({
      next: (updatedPhoto) => {
        // 🔹 Actualizar en allPhotos (fuente de verdad)
        photoInAll.isFavorite = newFavoriteState;

        // 🔹 Actualizar en photos si existe (filtrado actual)
        if (photoInFiltered) {
          photoInFiltered.isFavorite = newFavoriteState;
        }

        // 🔹 Actualizar también en selectedPhoto si está abierto
        if (this.selectedPhoto && this.selectedPhoto.id === photoId) {
          this.selectedPhoto.isFavorite = newFavoriteState;
        }

        // 🔹 Si estamos en filtro de favoritos, necesitamos refiltra
        // para que las fotos que dejan de ser favoritas desaparezcan
        if (this.activeFilter === 'favorites') {
          this.updateFilteredPhotos();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error al actualizar favorito:', err);
        this.cdr.detectChanges();
      },
    });
  }

  onRequestAddToAlbum(payload: { id: string; label?: string }) {
    this.photoIdForAlbum = payload.id;
    this.photoLabelForAlbum = payload.label;
    this.showSelectAlbumModal = true;
    this.cdr.detectChanges();
  }

  onRequestRemoveFromAlbum(payload: { photoId: string; albumId: string; albumName?: string }) {
    this.photoPendingDeletion = payload.photoId;
    this.albumIdForRemoval = payload.albumId;
    this.albumNameForRemoval = payload.albumName;
    this.confirmRemoveFromAlbumVisible = true;
    this.photoPendingDeletion = payload.photoId;
    this.cdr.detectChanges();
  }

  // ========================================================
  // 🔹 Utilidades internas
  // ========================================================
  private updateFilteredPhotos() {
    let filtered: Photo[] = this.allPhotos;

    if (this.activeFilter === 'all') {
      // Mostrar todas las fotos
      filtered = this.allPhotos;
    } else if (this.activeFilter === 'favorites') {
      // Mostrar solo favoritas
      filtered = this.allPhotos.filter((photo) => photo.isFavorite === true);
    } else if (this.isAlbumFilter(this.activeFilter)) {
      const albumId = this.extractAlbumId(this.activeFilter);
      const album = this.albums.find((item) => item.id === albumId);
      const photoIds = album?.photoIds ?? [];
      filtered = this.allPhotos.filter((photo) => photoIds.includes(photo.id));
    }

    this.photos = [...filtered];
    this.selectedPhoto = null;
    this.selectedIndex = -1;
    this.evaluateSkeletonState();
  }

  private evaluateSkeletonState() {
    if (!this.photos.length) {
      this.isSkeletonVisible = false;
      return;
    }
    const loadedCount = this.photos.filter((photo) =>
      this.globalLoadedPhotoIds.has(photo.id),
    ).length;
    const threshold = Math.min(this.photos.length, this.skeletonPlaceholders.length);
    this.isSkeletonVisible = loadedCount < threshold;
  }

  retryLoading() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.bootstrapPhotos();
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'No pude cargar las fotos, intenta más tarde.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'No pude cargar las fotos, intenta más tarde.';
  }

  private isAlbumFilter(filter: GalleryFilter): filter is `album:${string}` {
    return typeof filter === 'string' && filter.startsWith('album:') && filter !== 'all' && filter !== 'favorites';
  }

  private extractAlbumId(filter: `album:${string}`): string {
    return filter.slice('album:'.length);
  }

  private buildAlbumFilter(albumId: string): `album:${string}` {
    return `album:${albumId}` as const;
  }

  private openAlbumEditor(album: Album) {
    this.albumBeingEdited = album;
    this.showAlbumCreator = true;
    this.confirmDeleteVisible = false;
    this.cdr.detectChanges();
  }

  closeAlbumEditor() {
    this.showAlbumCreator = false;
    this.albumBeingEdited = null;
    this.confirmDeleteVisible = false;
    this.cdr.detectChanges();
  }

  onAlbumUpdate(payload: { id: string; name: string; description: string }) {
    this.isLoaderVisible = true;
    this.loaderMessage = 'Guardando cambios del álbum...';

    this.albumService
      .updateAlbum(payload.id, {
        name: payload.name,
        description: payload.description,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoaderVisible = false;
          this.loaderMessage = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeAlbumEditor();
        },
        error: (err) => {
          console.error('❌ Error al actualizar álbum:', err);
        },
      });
  }

  onAlbumRemove(albumId: string) {
    const targetAlbum = this.albums.find((album) => album.id === albumId) ?? null;
    if (!targetAlbum) {
      console.warn('Album not found for deletion:', albumId);
      return;
    }

    this.albumBeingEdited = targetAlbum;
    this.confirmDeleteVisible = true;
    this.cdr.detectChanges();
  }

  cancelAlbumRemoval() {
    this.confirmDeleteVisible = false;
    this.cdr.detectChanges();
  }

  confirmAlbumRemoval() {
    if (!this.albumBeingEdited) {
      this.confirmDeleteVisible = false;
      return;
    }

    this.isLoaderVisible = true;
    this.loaderMessage = 'Eliminando álbum...';

    const targetId = this.albumBeingEdited.id;
    const wasActive = this.activeFilter === this.buildAlbumFilter(targetId);

    this.albumService
      .deleteAlbum(targetId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoaderVisible = false;
          this.loaderMessage = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeAlbumEditor();
          this.confirmDeleteVisible = false;
          if (wasActive) {
            this.applyFilter('all');
          }
        },
        error: (err) => {
          console.error('❌ Error al eliminar álbum:', err);
          this.confirmDeleteVisible = false;
        },
      });
  }

  confirmPhotoRemoval() {
    const photoId = this.photoPendingDeletion;
    if (!photoId) {
      this.cancelPhotoRemoval();
      return;
    }

    this.isLoaderVisible = true;
    this.loaderMessage = 'Eliminando recuerdo...';
    this.confirmPhotoDeleteVisible = false;
    this.photoPendingDeletion = null;
    this.onDeletePhoto(photoId);
  }

  cancelPhotoRemoval() {
    this.confirmPhotoDeleteVisible = false;
    this.photoPendingDeletion = null;
  }

  addPhotoToSelectedAlbums(payload: { toAdd: string[]; toRemove: string[] }) {
    if (!this.photoIdForAlbum) {
      return;
    }

    const { toAdd, toRemove } = payload;
    const totalOperations = toAdd.length + toRemove.length;

    if (totalOperations === 0) {
      this.cancelAlbumSelection();
      return;
    }

    // 🔹 Mostrar mensaje apropiado
    let message = '';
    if (toAdd.length > 0 && toRemove.length > 0) {
      message = 'Actualizando álbumes...';
    } else if (toAdd.length > 0) {
      message = toAdd.length > 1 ? 'Agregando a tus álbumes...' : 'Agregando al álbum...';
    } else {
      message = toRemove.length > 1 ? 'Quitando de tus álbumes...' : 'Quitando del álbum...';
    }

    this.isLoaderVisible = true;
    this.loaderMessage = message;
    this.isAddToAlbumLoading = true;

    const photoId = this.photoIdForAlbum;
    const operations: Observable<any>[] = [];

    // 🔹 Agregar a álbumes
    if (toAdd.length > 0) {
      operations.push(this.albumService.addPhotoToAlbums(photoId, toAdd));
    }

    // 🔹 Eliminar de álbumes
    toRemove.forEach((albumId) => {
      operations.push(this.albumService.removePhotoFromAlbum(albumId, photoId));
    });

    // 🔹 Ejecutar todas las operaciones en paralelo
    if (operations.length === 0) {
      this.cancelAlbumSelection();
      return;
    }

    forkJoin(operations)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoaderVisible = false;
          this.loaderMessage = '';
          this.isAddToAlbumLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.showSelectAlbumModal = false;
          this.photoIdForAlbum = null;
          this.photoLabelForAlbum = undefined;
          this.forceScrollTop();
        },
        error: (err: any) => {
          console.error('❌ Error al actualizar álbumes:', err);
        },
      });
  }

  cancelAlbumSelection() {
    this.showSelectAlbumModal = false;
    this.photoIdForAlbum = null;
    this.photoLabelForAlbum = undefined;
    this.isAddToAlbumLoading = false;
    this.cdr.detectChanges();
  }

  confirmRemoveFromAlbum() {
    if (!this.albumIdForRemoval || !this.photoPendingDeletion) {
      this.cancelRemoveFromAlbum();
      return;
    }

    const albumId = this.albumIdForRemoval;
    const photoId = this.photoPendingDeletion;

    this.isLoaderVisible = true;
    this.loaderMessage = 'Quitando recuerdo del álbum...';
    this.isRemoveFromAlbumLoading = true;

    this.albumService
      .removePhotoFromAlbum(albumId, photoId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoaderVisible = false;
          this.loaderMessage = '';
          this.isRemoveFromAlbumLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.confirmRemoveFromAlbumVisible = false;
          this.albumIdForRemoval = null;
          this.albumNameForRemoval = undefined;
          this.photoPendingDeletion = null;
          this.closePreview();
          // Refrescar lista de álbumes para que el filtro se actualice
          this.bootstrapPhotos(true);
        },
        error: (err) => {
          console.error('❌ Error al quitar foto del álbum:', err);
          this.cancelRemoveFromAlbum();
        },
      });
  }

  cancelRemoveFromAlbum() {
    this.confirmRemoveFromAlbumVisible = false;
    this.albumIdForRemoval = null;
    this.albumNameForRemoval = undefined;
    this.photoPendingDeletion = null;
    this.isRemoveFromAlbumLoading = false;
    this.cdr.detectChanges();
  }

  // ========================================================
  // 🔹 Scroll al top
  // ========================================================
  private forceScrollTop() {
    try {
      this.scroller.scrollToPosition([0, 0]);
    } catch {}

    const tryScroll = (attempt = 0) => {
      if (attempt > 10) return;
      const doc = document as Document;
      const candidates: (Window | Element | null)[] = [
        window,
        doc.scrollingElement,
        doc.documentElement,
        doc.body,
      ];
      candidates.forEach((t) => {
        if (!t) return;
        if (t === window) window.scrollTo({ top: 0 });
        else (t as HTMLElement).scrollTo?.({ top: 0 });
      });
      if ((window.scrollY ?? 0) !== 0 || (doc.scrollingElement?.scrollTop ?? 0) !== 0) {
        this.rafId = requestAnimationFrame(() => tryScroll(attempt + 1));
      }
    };
    setTimeout(() => tryScroll(0), 0);
  }
}
