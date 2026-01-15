import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmojiSelectorService {
  // Estado de visibilidad
  isOpen = signal(false);

  // Observable para emitir el emoji seleccionado
  private emojiSelectedSource = new Subject<string>();
  emojiSelected$ = this.emojiSelectedSource.asObservable();

  // Callback para cuando se selecciona un emoji
  private currentCallback: ((emoji: string) => void) | null = null;

  /**
   * Abre el modal de selección de emojis
   * @param onSelect Callback que se ejecuta cuando se selecciona un emoji
   */
  open(onSelect: (emoji: string) => void) {
    this.currentCallback = onSelect;
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden'; // Bloquear scroll
  }

  /**
   * Cierra el modal
   */
  close() {
    this.isOpen.set(false);
    this.currentCallback = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  /**
   * Selecciona un emoji y cierra el modal
   */
  selectEmoji(emoji: string) {
    if (this.currentCallback) {
      this.currentCallback(emoji);
    }
    this.emojiSelectedSource.next(emoji);
    this.close();
  }
}
