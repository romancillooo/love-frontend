import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
export class PhotoGalleryComponent implements OnInit {
  readonly skeletonPlaceholders = Array.from({ length: 6 }, (_, index) => index);

  private allPhotos: Photo[] = [];
  photos: Photo[] = [];
  filterYears: Array<'all' | number> = ['all'];
  activeYear: 'all' | number = 'all';

  selectedPhoto: Photo | null = null;
  selectedIndex = -1;

  private readonly globalLoadedPhotoIds = new Set<number>();
  isSkeletonVisible = true;

  constructor(
    private readonly memories: MemoriesService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.bootstrapPhotos();
  }

  ngOnInit() {
    // 🔹 Llevar al tope solo en navegador
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get hasNextPhoto(): boolean {
    return this.selectedIndex < this.photos.length - 1;
  }

  get hasPreviousPhoto(): boolean {
    return this.selectedIndex > 0;
  }

  openPreview(photo: Photo) {
    this.selectedIndex = this.photos.findIndex(p => p.id === photo.id);
    this.selectedPhoto = this.photos[this.selectedIndex] ?? null;

    // 🔹 Asegurar que al abrir la foto también se vea desde arriba
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

    // 🔹 Volver al top al cambiar de año
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPhotoLoaded(photoId: number) {
    this.globalLoadedPhotoIds.add(photoId);
    this.evaluateSkeletonState();
  }

  hasPhotoLoaded(photoId: number): boolean {
    return this.globalLoadedPhotoIds.has(photoId);
  }

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
}
