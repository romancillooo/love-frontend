// src/app/core/services/letter-chat.service.ts
import { Injectable, signal } from '@angular/core';
import { Letter, LetterComment } from '../models/letter';

/**
 * Servicio para coordinar el estado del chat de cartas entre componentes.
 * Permite que el Navbar muestre el botón de chat solo cuando estamos en una carta.
 */
@Injectable({
  providedIn: 'root',
})
export class LetterChatService {
  // Estado actual de la carta (null si no estamos viendo una carta)
  private readonly _currentLetter = signal<Letter | null>(null);
  private readonly _isOpen = signal(false);
  private readonly _isSending = signal(false);
  private readonly _unreadCount = signal(0); // 🔹 Nuevos mensajes no vistos en esta sesión

  // Señales públicas de solo lectura
  readonly currentLetter = this._currentLetter.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();
  readonly isSending = this._isSending.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();

  // Callbacks para comunicar con letter-detail
  private onSendCallback: ((content: string) => void) | null = null;
  private onToggleCallback: (() => void) | null = null;

  /**
   * Llamar cuando entramos al detalle de una carta
   */
  setCurrentLetter(letter: Letter | null) {
    this._currentLetter.set(letter);
    if (!letter) {
      this._isOpen.set(false);
      this._unreadCount.set(0);
    } else {
      // Al cargar, sincronizar lo visto
      this.syncReadStatus(letter);
    }
  }

  /**
   * Actualizar la carta actual (por ejemplo cuando llegan nuevos comentarios)
   */
  updateLetter(letter: Letter) {
    this._currentLetter.set(letter);
    
    // Si el drawer esta abierto, actualizamos lo visto inmediatamente
    if (this._isOpen()) {
      this.markAsRead(letter);
    } else {
      // Si esta cerrado, calculamos unreads
      this.calculateUnreads(letter);
    }
  }

  /**
   * Registrar callbacks desde letter-detail
   */
  registerCallbacks(
    onToggle: () => void,
    onSend: (content: string) => void
  ) {
    this.onToggleCallback = onToggle;
    this.onSendCallback = onSend;
  }

  /**
   * Limpiar callbacks cuando se destruye letter-detail
   */
  clearCallbacks() {
    this.onToggleCallback = null;
    this.onSendCallback = null;
  }

  /**
   * Llamado desde navbar para abrir/cerrar el chat
   */
  toggleChat() {
    // Invertimos estado local optimista (aunque se sincroniza con setOpen desde componente)
    const newState = !this._isOpen();
    this._isOpen.set(newState);
    
    if (newState && this._currentLetter()) {
      this.markAsRead(this._currentLetter()!);
    }

    if (this.onToggleCallback) {
      this.onToggleCallback();
    }
  }

  /**
   * Actualizar estado de envío
   */
  setSending(value: boolean) {
    this._isSending.set(value);
  }

  /**
   * Actualizar estado de apertura
   */
  setOpen(value: boolean) {
    this._isOpen.set(value);
    if (value && this._currentLetter()) {
      this.markAsRead(this._currentLetter()!);
    }
  }

  /**
   * Obtener conteo de comentarios
   */
  getCommentsCount(): number {
    const letter = this._currentLetter();
    return letter?.comments?.length || 0;
  }
  
  // --- Logic de Unread ---
  
  private syncReadStatus(letter: Letter) {
    if (typeof localStorage === 'undefined') return;
    
    const key = `letter_read_count_${letter.id}`;
    const seenCount = parseInt(localStorage.getItem(key) || '0', 10);
    const total = letter.comments?.length || 0;
    
    // Si hay más comentarios que los vistos, son unreads.
    // PERO: Si acabamos de cargar la página, asumimos que el usuario NO los ha visto?
    // O asumimos que si entra a la carta los ve?
    // Requerimiento: "solo si tengo nuevos mensajes que no he visto"
    
    // ESTRATEGIA: Al entrar a la carta (setCurrentLetter), asumimos que 
    // lo que habia NO es nuevo (para no molestar), a menos que el usuario lo prefiera.
    // Generalmente "Badge" es notificación de algo nuevo DESDE que abrí la app o carta.
    
    // Opción 1: Al entrar, unread = 0 siempre, y guardamos el total actual como "visto".
    // Así solo notificamos los que llegan via Socket mientras navegas.
    
    // Opción 2: Usar localStorage persistente. Si salí con 5 y vuelvo y hay 7, veo badge 2.
    // Usaremos Opción 2.
    
    if (total > seenCount) {
      this._unreadCount.set(total - seenCount);
    } else {
      this._unreadCount.set(0);
      // Actualizar storage para evitar inconsistencias hacia abajo (borrados)
      if (total < seenCount) {
         localStorage.setItem(key, total.toString());
      }
    }
  }
  
  private markAsRead(letter: Letter) {
    if (typeof localStorage === 'undefined') return;
    const total = letter.comments?.length || 0;
    localStorage.setItem(`letter_read_count_${letter.id}`, total.toString());
    this._unreadCount.set(0);
  }
  
  private calculateUnreads(letter: Letter) {
    if (typeof localStorage === 'undefined') return;
    const key = `letter_read_count_${letter.id}`;
    const seenCount = parseInt(localStorage.getItem(key) || '0', 10);
    const total = letter.comments?.length || 0;
    
    if (total > seenCount) {
      this._unreadCount.set(total - seenCount);
    } else {
      this._unreadCount.set(0);
    }
  }
}
