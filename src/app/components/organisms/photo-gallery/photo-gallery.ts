import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoCardComponent, Photo } from '../../atoms/photo-card/photo-card';
import { PhotoPreviewComponent } from '../../molecules/photo-preview/photo-preview';
import photosData from '../../../../../public/assets/data/photos.json';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule, PhotoCardComponent, PhotoPreviewComponent],
  templateUrl: './photo-gallery.html',
  styleUrls: ['./photo-gallery.scss']
})
export class PhotoGalleryComponent {
  photos: Photo[] = (photosData as Photo[]);
  selectedPhoto: Photo | null = null;

  openPreview(photo: Photo) {
    this.selectedPhoto = photo;
  }

  closePreview() {
    this.selectedPhoto = null;
  }
}
