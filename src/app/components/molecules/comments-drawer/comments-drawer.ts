import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LetterComment } from '../../../core/models/letter';
import { AuthService } from '../../../core/auth';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comments-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="drawer-overlay" [class.visible]="isOpen" (click)="close()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        
        <!-- Header con botón cerrar -->
        <header class="drawer-header">
          <div class="header-content">
            <button class="close-btn" (click)="close()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="title-area">
              <h3>Chat de la carta</h3>
              <span class="count">{{ comments.length }} mensajes</span>
            </div>
          </div>
        </header>

        <div class="drawer-content" #scrollContainer>
          <ul class="comment-list">
            <li 
              *ngFor="let comment of comments" 
              class="comment-list-item"
              (touchstart)="onTouchStart($event, comment)"
              (touchmove)="onTouchMove($event)"
              (touchend)="onTouchEnd()"
            >
              <div 
                class="comment-item" 
                [class.own]="isOwnComment(comment)"
                [style.transform]="getTransform(comment)"
                [class.swiping]="swipedComment === comment"
              >
                <!-- Icono de reply reveal -->
                <div class="reply-reveal-icon">
                  <mat-icon>reply</mat-icon>
                </div>
              
                <div class="comment-bubble">
                  <span class="author-name" *ngIf="!isOwnComment(comment)">{{ comment.user.displayName }}</span>
                  
                  <!-- Mensaje citado dentro del comentario -->
                  <div class="quoted-message" *ngIf="comment.replyTo">
                    <div class="quote-bar"></div>
                    <div class="quote-content">
                      <span class="quote-author">{{ comment.replyTo.user.displayName }}</span>
                      <p class="quote-text">{{ comment.replyTo.content }}</p>
                    </div>
                  </div>

                  <p class="comment-text">{{ comment.content }}</p>
                  <span class="comment-time">{{ comment.createdAt | date:'shortTime' }}</span>
                </div>
              </div>
            </li>
          </ul>
          
          <div *ngIf="comments.length === 0" class="empty-state">
            <p>Escribe el primer mensaje...</p>
          </div>

          <!-- Typing Indicator -->
          <div class="typing-indicator-container" *ngIf="typingUsers.length > 0">
            <div class="typing-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <span class="typing-text">
              {{ typingUsers.length === 1 ? typingUsers[0] + ' está escribiendo...' : 'Varias personas escribiendo...' }}
            </span>
          </div>
        </div>

        <footer class="drawer-footer">
          <!-- Vista previa de respuesta -->
          <div class="reply-preview" *ngIf="replyingTo">
            <div class="reply-content">
              <span class="reply-title">Respondiendo a {{ replyingTo.user.displayName }}</span>
              <p class="reply-to-text">{{ replyingTo.content }}</p>
            </div>
            <button class="close-reply-btn" (click)="cancelReply()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="input-area">
            <input 
              #commentInput
              type="text" 
              [(ngModel)]="newComment" 
              (ngModelChange)="onInputChange($event)"
              (keyup.enter)="send()"
              placeholder="Escribe un mensaje..."
              [disabled]="isSending"
              autocomplete="off"
            />
            <button class="send-btn" (click)="send()" [disabled]="!newComment.trim() || isSending">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </footer>

      </div>
    </div>
  `,
  styles: [`
    .drawer-overlay {
      position: fixed;
      inset: 0;
      z-index: 1900;
      background: rgba(139, 92, 246, 0.22);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;

      &.visible {
        opacity: 1;
        pointer-events: auto;
        
        .drawer-panel {
          transform: translateX(0);
        }
      }
    }

    .drawer-panel {
      background: rgba(139, 92, 246, 0.45); /* Base más sólida */
      backdrop-filter: blur(25px) saturate(180%);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
      
      /* 🔹 Posición Full Screen Side Drawer */
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-width: 600px; /* En desktop limita el ancho */
      
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      
      display: flex;
      flex-direction: column;
      color: #fff;
    }

    .drawer-header {
      padding: 16px;
      padding-top: max(16px, env(safe-area-inset-top));
      background: rgba(0,0,0,0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .close-btn {
      background: none;
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .title-area {
      display: flex;
      flex-direction: column;
      
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #fff;
      }

      .count {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }
    }

    .drawer-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .comment-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comment-item {
      display: flex;
      width: 100%;
      
      &.own {
        justify-content: flex-end;
        
        .comment-bubble {
          background: rgba(255, 255, 255, 0.25);
          border-bottom-right-radius: 4px;
        }
      }
      
      &:not(.own) {
        justify-content: flex-start;
        
        .comment-bubble {
          background: rgba(124, 58, 237, 0.45); /* Morado más oscuro para el otro */
          border-bottom-left-radius: 4px;
        }
      }
    }

    .comment-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      .author-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 1);
        margin-bottom: 2px;
      }

      .comment-text {
        margin: 0;
        font-size: 1rem;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .comment-time {
        align-self: flex-end;
        font-size: 0.65rem;
        opacity: 0.7;
        margin-top: 4px;
      }
    }

    .empty-state {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      color: rgba(255, 255, 255, 0.5);
    }

    .drawer-footer {
      padding: 16px;
      padding-bottom: max(16px, env(safe-area-inset-bottom));
      background: rgba(0, 0, 0, 0.1);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .input-area {
      display: flex;
      gap: 12px;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 6px 6px 6px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);

      &:focus-within {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.4);
      }
      
      input {
        flex: 1;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 1rem;
        outline: none;
        padding: 4px 0;
        
        &::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      }

      .send-btn {
        background: #fff;
        color: #7c3aed; /* Purple detail */
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s, opacity 0.2s;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.5);
        }

        &:not(:disabled):hover {
          transform: scale(1.05);
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          margin-left: 2px; /* Visual fix for send icon center */
        }
      }
    }
    
    /* Estilos Swipe & Reply */
    .comment-list-item {
      display: block;
      overflow: hidden; /* Ocultar el icono reveal fuera del bounds */
      user-select: none;
    }
    
    .comment-item {
      position: relative;
      transition: transform 0.1s linear; /* Suave mientras deslizas */
      
      &.swiping {
        transition: none; /* Instantáneo en touch move */
      }
    }

    .reply-reveal-icon {
      position: absolute;
      left: -40px; /* Escondido a la izquierda */
      top: 50%;
      transform: translateY(-50%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
    }

    .reply-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.2);
      border-left: 3px solid #fff;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      animation: slide-up 0.2s ease-out;

      .reply-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
      }

      .reply-title {
        font-size: 0.75rem;
        color: #fff; /* Título morado claro */
        font-weight: 700;
      }

      .reply-to-text {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0;
      }
      
      .close-reply-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        
        &:hover {
          color: #fff;
        }
      }
    }

    /* Mensaje citado dentro de la burbuja */
    .quoted-message {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
      display: flex;
      gap: 6px;
      border-left: 3px solid rgba(255, 255, 255, 0.5);

      .quote-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .quote-author {
        font-size: 0.7rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
      }

      .quote-text {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0;
      }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Typing Indicator Styles */
    .typing-indicator-container {
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .typing-bubble {
      background: rgba(124, 58, 237, 0.45); /* Same as OTHER user bubble */
      padding: 8px 12px;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: fit-content;
    }

    .dot {
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: typing-dot 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    .dot:nth-child(3) { animation-delay: 0s; }

    @keyframes typing-dot {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    .typing-text {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-style: italic;
    }
  `]
})
export class CommentsDrawerComponent implements OnChanges, AfterViewChecked {
  @Input() comments: LetterComment[] = [];
  @Input() isOpen = false;
  @Input() isSending = false;
  @Input() typingUsers: string[] = []; // Nombres de usuarios escribiendo
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() sendComment = new EventEmitter<{ content: string, replyToId?: string }>();
  @Output() userTyping = new EventEmitter<boolean>(); // true = start, false = stop

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('commentInput') private commentInput!: ElementRef;

  newComment = '';
  currentUser: { username: string } | null = null;
  
  // Estado de Swipe & Reply
  replyingTo: LetterComment | null = null;
  swipedComment: LetterComment | null = null;
  touchStartX = 0;
  currentTranslateX = 0;
  readonly SWIPE_THRESHOLD = 50; // px para activar reply

  constructor(private auth: AuthService) {
    this.currentUser = this.auth.getUser();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        this.scrollToBottom();
        // Focus input after animation
        setTimeout(() => this.commentInput?.nativeElement?.focus(), 300);
      } else {
        document.body.style.overflow = '';
        this.cancelReply(); // Limpiar reply al cerrar
      }
    }
    
    // Si cambian los comentarios y está abierto, scroll abajo
    if (changes['comments'] && this.isOpen) {
      this.scrollToBottom();
    }

    // Scroll al hacer typing
    if (changes['typingUsers'] && this.typingUsers.length > 0 && this.isOpen) {
      this.scrollToBottom();
    }
  }

  ngAfterViewChecked() {
    // Check if user is near bottom to auto scroll? For now just simple scroll on change
  }

  close() {
    this.closeDrawer.emit();
  }

  send() {
    if (!this.newComment.trim() || this.isSending) return;
    
    this.sendComment.emit({
      content: this.newComment,
      replyToId: this.replyingTo?._id
    });
    
    this.newComment = '';
    this.cancelReply();
  }

  isOwnComment(comment: LetterComment): boolean {
    return comment.user.username === this.currentUser?.username;
  }
  
  cancelReply() {
    this.replyingTo = null;
  }

  // --- Logic de Swipe ---

  onTouchStart(event: TouchEvent, comment: LetterComment) {
    this.touchStartX = event.touches[0].clientX;
    this.swipedComment = comment;
    this.currentTranslateX = 0;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.swipedComment) return;
    
    const touchX = event.touches[0].clientX;
    const deltaX = touchX - this.touchStartX;

    // Solo permitir swipe a la derecha (positivo) y limitar
    if (deltaX > 0 && deltaX < 100) {
      this.currentTranslateX = deltaX;
      // Prevenir scroll vertical si estamos haciendo swipe horizontal intencional
      if (deltaX > 10) {
        // Opción: event.preventDefault() si el elemento no tiene scroll interno horizontal
      }
    }
  }

  onTouchEnd() {
    if (this.currentTranslateX > this.SWIPE_THRESHOLD && this.swipedComment) {
      // Activar Reply
      this.startReply(this.swipedComment);
      
      // Vibración de feedback (si es soportado)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    // Reset
    this.swipedComment = null;
    this.currentTranslateX = 0;
    this.touchStartX = 0;
  }

  getTransform(comment: LetterComment): string {
    if (this.swipedComment === comment) {
      return `translateX(${this.currentTranslateX}px)`;
    }
    return 'none';
  }
  
  private startReply(comment: LetterComment) {
    this.replyingTo = comment;
    this.commentInput?.nativeElement?.focus();
  }

  private scrollToBottom() {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch(err) { }
    }, 100);
  }

  // --- Logic Typing ---
  private typingTimeout: any;

  onInputChange(val: string) {
    if (this.isSending) return;
    
    // Emitir start typing
    this.userTyping.emit(true);
    
    // Debounce stop typing
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.userTyping.emit(false);
    }, 2000);
  }
}
