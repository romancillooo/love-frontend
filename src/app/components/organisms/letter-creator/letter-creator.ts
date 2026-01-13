// src/app/components/organisms/letter-creator/letter-creator.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Letter } from '../../../core/models/letter';

@Component({
  selector: 'app-letter-creator',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './letter-creator.html',
  styleUrls: ['./letter-creator.scss'],
})
export class LetterCreatorComponent implements OnInit {
  @Input() editLetter?: Letter; // 🔹 Si se pasa, estamos en modo edición
  
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{
    title: string;
    icon: string;
    content: string;
  }>();
  @Output() update = new EventEmitter<{
    id: string;
    title: string;
    icon: string;
    content: string;
  }>();

  letterTitle = '';
  letterIcon = '';
  letterContent = '';
  isSubmitting = false;

  ngOnInit() {
    // 🔹 Si estamos editando, cargar los datos de la carta
    if (this.editLetter) {
      this.letterTitle = this.editLetter.title;
      this.letterIcon = this.editLetter.icon;
      this.letterContent = this.editLetter.content;
    }
  }

  get isEditMode(): boolean {
    return !!this.editLetter;
  }

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
      content: this.letterContent,
    };

    if (this.isEditMode && this.editLetter) {
      // Modo edición
      this.update.emit({ id: this.editLetter.id, ...payload });
    } else {
      // Modo creación
      this.create.emit(payload);
    }
    
    this.isSubmitting = false;
  }

  get isValid(): boolean {
    return (
      this.letterTitle.trim().length > 0 &&
      this.letterIcon.trim().length > 0 &&
      this.letterContent.trim().length > 0
    );
  }

  get submitLabel(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Guardando...' : 'Creando...';
    }
    return this.isEditMode ? 'Guardar Cambios' : 'Crear Carta';
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Carta' : 'Crear Nueva Carta';
  }
}
