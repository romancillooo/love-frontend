import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { EmojiSelectorService } from '../../../core/services/emoji-selector.service';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 🔹 Barra Rápida (Recientes) -->
    <div class="emoji-picker-container" [class.visible]="visible">
      <div class="emoji-grid">
        <button 
          *ngFor="let emoji of quickEmojis" 
          class="emoji-btn" 
          (click)="selectEmoji(emoji)"
          [class.selected]="currentEmoji === emoji"
          type="button"
        >
          {{ emoji }}
        </button>
        
        <!-- Botón Ver Más (Abre modal global) -->
        <button 
          class="emoji-btn more-btn" 
          (click)="openFullPicker()"
          type="button"
        >
          <span class="plus-icon">+</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ---------- BARRA RÁPIDA ---------- */
    .emoji-picker-container {
      /* Estilos Glassmorphism Premium */
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-radius: 99px;
      padding: 6px 10px;
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25);
      display: inline-block;
      border: 1px solid rgba(255, 255, 255, 0.45);
      
      opacity: 0;
      transform: translateY(15px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

      &.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
    }

    .emoji-grid {
      display: flex;
      gap: 2px;
    }

    .emoji-btn {
      background: none;
      border: none;
      font-size: 1.6rem;
      cursor: pointer;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &:hover {
        background: rgba(255, 255, 255, 0.5);
        transform: translateY(-4px) scale(1.15);
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
      }

      &:active {
        transform: translateY(0) scale(0.95);
      }

      &.selected {
        background: rgba(255, 255, 255, 0.6);
        box-shadow: 0 4px 12px rgba(167, 139, 250, 0.4);
        border: 1px solid rgba(167, 139, 250, 0.5);
        transform: scale(1.1);
      }
    }

    .more-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #6d28d9;
      
      .plus-icon {
        font-size: 1.4rem;
        font-weight: 300;
        margin-top: -2px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.4);
        border-color: #fff;
      }
    }
  `]
})
export class EmojiPickerComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() currentEmoji: string | undefined;
  @Output() emojiSelect = new EventEmitter<string>();

  private emojiSelectorService = inject(EmojiSelectorService);
  private subscription: Subscription | null = null;

  private readonly STORAGE_KEY = 'love_app_recent_emojis';
  
  // Default fallback
  readonly defaultEmojis = ['❤️', '😍', '🔥', '🥰', '✨'];
  
  // Emojis que se muestran en la barra rápida (Top 5)
  quickEmojis: string[] = [...this.defaultEmojis];

  // Historial completo de recientes
  recentEmojis: string[] = [];

  ngOnInit() {
    this.loadRecents();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  selectEmoji(emoji: string) {
    this.addToRecents(emoji);
    this.emojiSelect.emit(emoji);
  }

  /**
   * Abre el modal global de selección de emojis
   */
  openFullPicker() {
    this.emojiSelectorService.open((emoji) => {
      // Callback cuando se selecciona un emoji en el modal
      this.selectEmoji(emoji);
    });
  }

  // 🧠 Lógica de Persistencia
  private loadRecents() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.recentEmojis = parsed;
          this.updateQuickBar();
        }
      }
    } catch (e) {
      console.warn('Error loading emojis', e);
    }
  }

  private addToRecents(emoji: string) {
    // Remover si ya existe para moverlo al principio
    this.recentEmojis = this.recentEmojis.filter(e => e !== emoji);
    // Agregar al inicio
    this.recentEmojis.unshift(emoji);
    // Limitar a 20 recientes guardados
    if (this.recentEmojis.length > 20) {
      this.recentEmojis = this.recentEmojis.slice(0, 20);
    }
    
    // Guardar y Actualizar
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentEmojis));
    this.updateQuickBar();
  }

  private updateQuickBar() {
    // La barra rápida muestra los 5 más recientes.
    // Si hay menos de 5 recientes, rellena con los default que no estén ya.
    const newQuick = [...this.recentEmojis.slice(0, 5)];
    
    if (newQuick.length < 5) {
      for (const def of this.defaultEmojis) {
        if (!newQuick.includes(def)) {
          newQuick.push(def);
          if (newQuick.length === 5) break; 
        }
      }
    }
    this.quickEmojis = newQuick;
  }
}
