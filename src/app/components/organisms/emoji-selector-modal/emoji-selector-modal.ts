import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiEvent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { EmojiSelectorService } from '../../../core/services/emoji-selector.service';

@Component({
  selector: 'app-emoji-selector-modal',
  standalone: true,
  imports: [CommonModule, PickerComponent],
  template: `
    @if (emojiService.isOpen()) {
      <div class="emoji-selector-backdrop" (click)="close()">
        <div class="emoji-selector-modal" (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <header class="modal-header">
            <div class="header-content">
              <h2 class="modal-title">Elige tu reacción</h2>
            </div>
            <button class="close-btn" (click)="close()">
              <span>×</span>
            </button>
          </header>

          <!-- Body con Emoji Mart -->
          <div class="modal-body">
            <emoji-mart
              [style]="{ width: '100%' }"
              [darkMode]="true"
              [showPreview]="false"
              [i18n]="i18nEs"
              [perLine]="6"
              [emojiSize]="36"
              color="#a78bfa"
              (emojiSelect)="onEmojiSelect($event)"
            ></emoji-mart>
          </div>

        </div>
      </div>
    }
  `,
  styleUrl: './emoji-selector-modal.scss'
})
export class EmojiSelectorModalComponent {
  emojiService = inject(EmojiSelectorService);

  // 🔹 Traducciones al español
  i18nEs = {
    search: 'Buscar',
    clear: 'Limpiar',
    notfound: 'No se encontraron emojis',
    skintext: 'Elige tu tono de piel predeterminado',
    categories: {
      search: 'Resultados de búsqueda',
      recent: 'Usados frecuentemente',
      smileys: 'Caritas y Emociones',
      people: 'Personas y Cuerpo',
      nature: 'Animales y Naturaleza',
      foods: 'Comida y Bebida',
      activity: 'Actividades',
      places: 'Viajes y Lugares',
      objects: 'Objetos',
      symbols: 'Símbolos',
      flags: 'Banderas',
      custom: 'Personalizados',
    },
    categorieslabel: 'Categorías de emojis',
    skintones: {
      1: 'Tono de piel predeterminado',
      2: 'Tono de piel claro',
      3: 'Tono de piel claro medio',
      4: 'Tono de piel medio',
      5: 'Tono de piel medio oscuro',
      6: 'Tono de piel oscuro',
    },
  };

  close() {
    this.emojiService.close();
  }

  onEmojiSelect(event: EmojiEvent) {
    if (event.emoji && event.emoji.native) {
      this.emojiService.selectEmoji(event.emoji.native);
    }
  }
}
