// src/app/components/molecules/photo-preview/photo-preview.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Photo } from '../../../core/models/photo';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './photo-preview.html',
  styleUrls: ['./photo-preview.scss']
})
export class PhotoPreviewComponent implements OnChanges, OnDestroy {
  @Input() photo: Photo | null = null;
  @Input() hasNext = false;
  @Input() hasPrevious = false;
  @Input() index = 0;
  @Input() total = 0;
  @Output() close = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();

  private preventScroll = (e: TouchEvent) => e.preventDefault();

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
    this.close.emit();
    this.restoreScroll();
  }

  onNext() {
    if (this.hasNext) this.next.emit();
  }

  onPrevious() {
    if (this.hasPrevious) this.previous.emit();
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

  ngOnDestroy() {
    this.restoreScroll();
  }

  private restoreScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.removeEventListener('touchmove', this.preventScroll);
  }
}
