import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { PhotoCardComponent } from '../../atoms/photo-card/photo-card';
import { PhotoPreviewComponent } from '../../molecules/photo-preview/photo-preview';
import { Photo } from '../../../core/models/photo';
import { MemoriesService } from '../../../core/memories.service';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule, PhotoCardComponent, PhotoPreviewComponent],
  templateUrl: './photo-gallery.html',
  styleUrls: ['./photo-gallery.scss']
})
export class PhotoGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly skeletonPlaceholders = Array.from({ length: 6 }, (_, index) => index);

  private allPhotos: Photo[] = [];
  photos: Photo[] = [];
  filterYears: Array<'all' | number> = ['all'];
  activeYear: 'all' | number = 'all';

  selectedPhoto: Photo | null = null;
  selectedIndex = -1;

  private readonly globalLoadedPhotoIds = new Set<number>();
  isSkeletonVisible = true;

  private navSub?: Subscription;
  private rafId: number | null = null;

  constructor(
    private readonly memories: MemoriesService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly router: Router,
    private readonly scroller: ViewportScroller
  ) {
    this.bootstrapPhotos();
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Scroll también en cada navegación hacia /photos (cuando el componente ya existe/reusa vista)
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects.includes('/photos')) {
          this.forceScrollTop();
        }
      });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // Scroll al cargar la vista (primera vez o recarga)
    this.forceScrollTop();
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ---------- Navegación de la galería ----------
  get hasNextPhoto(): boolean {
    return this.selectedIndex < this.photos.length - 1;
  }
  get hasPreviousPhoto(): boolean {
    return this.selectedIndex > 0;
  }

  openPreview(photo: Photo) {
    this.selectedIndex = this.photos.findIndex(p => p.id === photo.id);
    this.selectedPhoto = this.photos[this.selectedIndex] ?? null;
  }

  closePreview() {
    this.selectedPhoto = null;
    this.selectedIndex = -1;
  }

  showNextPhoto() {
    if (!this.hasNextPhoto) return;
    this.selectedIndex = Math.min(this.photos.length - 1, this.selectedIndex + 1);
    this.selectedPhoto = this.photos[this.selectedIndex];
  }

  showPreviousPhoto() {
    if (!this.hasPreviousPhoto) return;
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.selectedPhoto = this.photos[this.selectedIndex];
  }

  filterByYear(year: 'all' | number) {
    if (this.activeYear === year) return;
    this.activeYear = year;
    this.updateFilteredPhotos();
    if (isPlatformBrowser(this.platformId)) this.forceScrollTop();
  }

  onPhotoLoaded(photoId: number) {
    this.globalLoadedPhotoIds.add(photoId);
    this.evaluateSkeletonState();
  }

  hasPhotoLoaded(photoId: number): boolean {
    return this.globalLoadedPhotoIds.has(photoId);
  }

  // ---------- Data ----------
  private bootstrapPhotos() {
    this.allPhotos = this.memories.getAllPhotos();
    this.photos = [...this.allPhotos];
    const years = this.memories.getPhotoYears();
    this.filterYears = ['all', ...years];
    this.evaluateSkeletonState();
  }

  private updateFilteredPhotos() {
    const filtered =
      this.activeYear === 'all'
        ? this.allPhotos
        : this.allPhotos.filter(
            photo => new Date(photo.createdAt).getFullYear() === this.activeYear
          );

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

    const loadedCount = this.photos.filter(photo =>
      this.globalLoadedPhotoIds.has(photo.id)
    ).length;
    const threshold = Math.min(this.photos.length, this.skeletonPlaceholders.length);
    this.isSkeletonVisible = loadedCount < threshold;
  }

  // ---------- Scroll robusto al top ----------
  private forceScrollTop() {
    // 1) Intento inmediato con ViewportScroller (Angular)
    try {
      this.scroller.scrollToPosition([0, 0]);
    } catch {}

    // 2) Intentos progresivos con distintos targets (por si hay contenedor con overflow)
    const tryScroll = (attempt = 0) => {
      if (attempt > 10) return; // máximo ~10 frames

      const doc = document as Document;
      const candidates: (Window | Element | null)[] = [
        window,
        doc.scrollingElement,
        doc.documentElement,
        doc.body,
        // contenedores comunes de layouts
        doc.querySelector('main'),
        doc.querySelector('.content'),
        doc.querySelector('.scroll-container'),
        doc.querySelector('.app-content'),
        doc.querySelector('.page'),
        doc.querySelector('.layout-content')
      ];

      candidates.forEach((t) => {
        if (!t) return;
        if (t === window) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } else {
          const el = t as HTMLElement;
          el.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
          // también forzar posiciones por compatibilidad
          (el as any).scrollTop = 0;
        }
      });

      // Si alguno ya está arriba, paramos; si no, reintenta en el siguiente frame
      const atTop =
        (window.scrollY ?? window.pageYOffset ?? 0) === 0 &&
        (doc.scrollingElement?.scrollTop ?? 0) === 0 &&
        (doc.documentElement?.scrollTop ?? 0) === 0 &&
        (doc.body?.scrollTop ?? 0) === 0;

      if (!atTop) {
        this.rafId = requestAnimationFrame(() => tryScroll(attempt + 1));
      }
    };

    // Pequeño defer para después del render y cálculo de layout (imágenes)
    setTimeout(() => tryScroll(0), 0);
  }
}
