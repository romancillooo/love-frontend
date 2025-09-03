import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface Photo {
  id: number;
  small: string;
  large: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-photo-card',
  standalone: true,
  templateUrl: './photo-card.html',
  styleUrls: ['./photo-card.scss']
})
export class PhotoCardComponent {
  @Input() photo!: Photo;
  @Output() openPreview = new EventEmitter<Photo>();

  randomRotation = 0;

  ngOnInit() {
    // Rotación aleatoria para dar ese efecto "desordenado"
    this.randomRotation = Math.floor(Math.random() * 12 - 6); // entre -6° y +6°
  }

  onClick() {
    this.openPreview.emit(this.photo);
  }
}
