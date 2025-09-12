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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['photo']) {
      if (this.photo) {
        // 🚫 Bloquear scroll al abrir
        document.body.style.overflow = 'hidden';
      } else {
        // ✅ Restaurar scroll al cerrar
        document.body.style.overflow = '';
      }
    }
  }

  onClose() {
    this.close.emit();
    // Por si acaso se cierre por otra vía
    document.body.style.overflow = '';
  }
}
