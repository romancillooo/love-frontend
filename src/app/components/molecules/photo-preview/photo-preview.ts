import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Photo } from '../../atoms/photo-card/photo-card';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-preview.html',
  styleUrls: ['./photo-preview.scss']
})
export class PhotoPreviewComponent implements OnChanges {
  @Input() photo: Photo | null = null;
  @Output() close = new EventEmitter<void>();

  private preventScroll = (e: TouchEvent) => e.preventDefault();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['photo']) {
      if (this.photo) {
        // 🚫 Bloquear scroll
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // 👇 Extra para iOS: previene gestos touch
        document.addEventListener('touchmove', this.preventScroll, { passive: false });
      } else {
        this.restoreScroll();
      }
    }
  }

  onClose() {
    this.close.emit();
    this.restoreScroll();
  }

  private restoreScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.removeEventListener('touchmove', this.preventScroll);
  }
}
