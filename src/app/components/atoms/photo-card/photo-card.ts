import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Photo } from '../../../core/models/photo';

@Component({
  selector: 'app-photo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-card.html',
  styleUrls: ['./photo-card.scss']
})
export class PhotoCardComponent {
  @Input() photo!: Photo;
  @Output() openPreview = new EventEmitter<Photo>();
  @Output() imageLoaded = new EventEmitter<number>();

  randomRotation = 0;
  cardTransform = 'rotate(0deg)';
  private hasEmittedLoad = false;

  ngOnInit() {
    // Rotación aleatoria para dar ese efecto "desordenado" playful.
    const range = this.getRotationRange();
    this.randomRotation = Math.round(Math.random() * (range * 2)) - range;
    this.cardTransform = `rotate(${this.randomRotation}deg)`;
  }

  onClick() {
    this.openPreview.emit(this.photo);
  }

  onImageLoad() {
    if (!this.hasEmittedLoad) {
      this.hasEmittedLoad = true;
      this.imageLoaded.emit(this.photo.id);
    }
  }

  private getRotationRange(): number {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      return 1; // rotaciones suaves en móvil
    }
    return 3;
  }
}
