import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Photo } from '../../atoms/photo-card/photo-card';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-preview.html',
  styleUrls: ['./photo-preview.scss']
})
export class PhotoPreviewComponent {
  @Input() photo: Photo | null = null;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
