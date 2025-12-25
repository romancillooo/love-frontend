// src/app/components/organisms/letter-creator/letter-creator.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-letter-creator',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './letter-creator.html',
  styleUrls: ['./letter-creator.scss'],
})
export class LetterCreatorComponent {
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{
    title: string;
    icon: string;
    content: string;
  }>();

  letterTitle = '';
  letterIcon = '';
  letterContent = '';
  isSubmitting = false;

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.letterTitle.trim() || !this.letterIcon.trim() || !this.letterContent.trim()) {
      return;
    }

    this.isSubmitting = true;

    const payload = {
      title: this.letterTitle.trim(),
      icon: this.letterIcon.trim(),
      // 🔹 Preservar saltos de línea: NO usar trim() en el contenido
      // El textarea captura los \n automáticamente cuando el usuario presiona Enter
      content: this.letterContent, // Mantener saltos de línea intactos
    };

    this.create.emit(payload);
    this.isSubmitting = false;
  }

  get isValid(): boolean {
    return (
      this.letterTitle.trim().length > 0 &&
      this.letterIcon.trim().length > 0 &&
      this.letterContent.trim().length > 0 // Validar que tenga contenido, pero preservar saltos de línea
    );
  }

  get submitLabel(): string {
    return this.isSubmitting ? 'Creando...' : 'Crear Carta';
  }
}

