// src/app/pages/letter-detail/letter-detail.ts
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { LetterService } from '../../core/services/letter.service';
import { Letter } from '../../core/models/letter';
import { AuthService } from '../../core/auth';
import { LetterChatService } from '../../core/services/letter-chat.service';
import { SocketService } from '../../core/services/socket.service';
import { ReactionBadgeComponent } from '../../components/molecules/reaction-badge/reaction-badge';
import { ReactionsDrawerComponent } from '../../components/molecules/reactions-drawer/reactions-drawer';
import { EmojiPickerComponent } from '../../components/atoms/emoji-picker/emoji-picker';
import { CommentsDrawerComponent } from '../../components/molecules/comments-drawer/comments-drawer';

@Component({
  selector: 'app-letter-detail',
  standalone: true,
  imports: [
    CommonModule, 
    ReactionBadgeComponent, 
    ReactionsDrawerComponent, 
 
    EmojiPickerComponent,
    CommentsDrawerComponent
  ],
  templateUrl: './letter-detail.html',
  styleUrls: ['./letter-detail.scss'],
})
export class LetterDetail implements OnInit, OnDestroy {
  letter: Letter | undefined;
  displayText = '';
  isLoading = true;
  loadError = '';
  isUserLetter = false; // 🔹 Para aplicar estilo diferente a cartas de usuarios
  
  // 🔹 Estado de Reacciones
  showReactionsDrawer = false;
  showCommentsDrawer = false;
  isSendingComment = false;
  showEmojiPicker = false;
  currentUser: { username: string } | null = null;
  typingUsers: string[] = []; // Nombres de usuarios escribiendo

  private typingIndex = 0;
  private lastTimestamp = 0;
  private animationId: number | null = null;
  private readonly stepDelay = 45; // ms
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly letterService: LetterService,
    private readonly auth: AuthService,
    private readonly letterChatService: LetterChatService,
    private readonly socketService: SocketService
  ) {
    this.currentUser = this.auth.getUser();
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        switchMap((id) => {
          if (!id) {
            this.handleMissingLetter('No reconocí la carta solicitada.');
            return of<Letter | undefined>(undefined);
          }

          this.resetState();
          return this.letterService.getLetterById(id).pipe(
            catchError((error) => {
              this.loadError = this.resolveError(error);
              return of<Letter | undefined>(undefined);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((letter) => {
        this.isLoading = false;
        this.letter = letter;
        if (letter) {
          this.checkUserLetter();
          this.startTypewriter();
          // Registrar carta en el servicio para que navbar la vea
          this.letterChatService.setCurrentLetter(letter);

          // 🔌 Conectarse al room de socket
          this.setupSocket(letter.id);

        } else if (!this.loadError) {
          this.loadError = 'No encontré esta carta, intenta con otra.';
        }
      });

    // Registrar callbacks para que navbar pueda controlar el chat
    this.letterChatService.registerCallbacks(
      () => this.toggleCommentsDrawer(),
      (content) => this.onSendComment({ content })
    );
  }

  ngOnDestroy() {
    this.cancelAnimation();
    this.destroy$.next();
    this.destroy$.complete();
    
    // 🔌 Desconectar socket de la carta
    if (this.letter) {
      this.socketService.leaveLetterRoom(this.letter.id);
    }
    
    // Limpiar carta del servicio al salir
    this.letterChatService.setCurrentLetter(null);
    this.letterChatService.clearCallbacks();
  }

  // ---------- Socket Setup ----------
  private setupSocket(letterId: string) {
    this.socketService.connect();
    this.socketService.joinLetterRoom(letterId);

    // Escuchar nuevos comentarios
    this.socketService.onNewComment()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.letterId === this.letter?.id && this.letter) {
          // Si el comentario es mío, quizas ya lo tengo por el optimistic UI (o la respuesta del POST)
          // Pero por simplicidad, lo agregamos si no existe (por ID)
          const exists = this.letter.comments?.some(c => c._id === data.comment._id);
          if (!exists) {
            this.letter.comments = [...(this.letter.comments || []), data.comment];
            this.letterChatService.updateLetter(this.letter);
            this.cdr.markForCheck();
          }
        }
      });

    // Escuchar actualizaciones de reacciones
    this.socketService.onReactionUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.letterId === this.letter?.id && this.letter) {
          this.letter.reactions = data.reactions;
          this.cdr.markForCheck();
        }
      });
      
    // Escuchar typing
    this.socketService.onUserTyping()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.letterId === this.letter?.id && data.user.username !== this.currentUser?.username) {
          if (!this.typingUsers.includes(data.user.displayName)) {
            this.typingUsers = [...this.typingUsers, data.user.displayName];
            this.cdr.markForCheck();
          }
        }
      });
      
    this.socketService.onUserStopTyping()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.letterId === this.letter?.id) {
          // Use 'any' cast or check property existence if needed
          const displayName = (data.user as any).displayName || data.user.username;
          this.typingUsers = this.typingUsers.filter(u => u !== data.user.username && u !== displayName);
          this.cdr.markForCheck();
        }
      });
  }

  // ---------- Animación de escritura ----------
  private readonly typeWriterStep = (timestamp: number) => {
    if (!this.letter) return;

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const elapsed = timestamp - this.lastTimestamp;
    if (elapsed >= this.stepDelay) {
      const steps = Math.max(1, Math.floor(elapsed / this.stepDelay));
      this.typingIndex = Math.min(this.typingIndex + steps, this.letter.content.length);
      this.displayText = this.letter.content.slice(0, this.typingIndex);
      this.lastTimestamp = timestamp;
      this.cdr.markForCheck();
    }

    if (this.typingIndex < this.letter.content.length) {
      this.animationId = requestAnimationFrame(this.typeWriterStep);
    } else {
      this.cancelAnimation();
    }
  };

  private startTypewriter() {
    this.cancelAnimation();
    this.displayText = '';
    this.typingIndex = 0;
    this.lastTimestamp = 0;
    this.animationId = requestAnimationFrame(this.typeWriterStep);
  }

  private cancelAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private resetState() {
    this.isLoading = true;
    this.loadError = '';
    this.displayText = '';
    this.typingIndex = 0;
    this.lastTimestamp = 0;
    this.cancelAnimation();
  }

  private handleMissingLetter(message: string) {
    this.isLoading = false;
    this.loadError = message;
    this.letter = undefined;
    this.displayText = '';
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Ocurrió un problema al cargar la carta.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ocurrió un problema al cargar la carta.';
  }

  goBack() {
    this.router.navigate(['/letters']);
  }

  /** 🔹 Detecta si la carta fue creada por un usuario regular */
  private checkUserLetter() {
    if (!this.letter) return;
    
    const role = this.letter.createdBy?.role;
    const username = this.letter.createdBy?.username;
    
    // Si tiene rol definido, usarlo
    if (role === 'user') {
      this.isUserLetter = true;
      return;
    }
    
    // Fallback: detectar por username (temporal)
    const superadminUsernames = ['romancillooo', 'bebitos'];
    this.isUserLetter = !!(username && !superadminUsernames.includes(username));
  }

  getContainerClass(): string {
    return this.isUserLetter ? 'letter-container letter-container--user' : 'letter-container';
  }

  // ========================================================
  // 😍 Reacciones Logic
  // ========================================================
  
  toggleReactionsDrawer() {
    this.showReactionsDrawer = !this.showReactionsDrawer;
  }

  toggleEmojiPicker(event?: Event) {
    if (event) event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  get myReaction(): string | undefined {
    if (!this.letter || !this.letter.reactions || !this.currentUser) return undefined;
    const reaction = this.letter.reactions.find(r => r.user.username === this.currentUser?.username);
    return reaction?.emoji;
  }

  onReact(emoji: string) {
    if (!this.letter) return;
    
    // Optimistic Update (opcional/visual)
    this.showEmojiPicker = false;

    this.letterService.reactToLetter(this.letter.id, emoji).subscribe({
      next: (updatedLetter) => {
        this.letter = updatedLetter;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error reacting', err);
        // Revertir si fuera necesario
      }
    });
  }



  // ========================================================
  // 💬 Comentarios Logic
  // ========================================================
  toggleCommentsDrawer() {
    this.showCommentsDrawer = !this.showCommentsDrawer;
  }

  onSendComment(event: { content: string, replyToId?: string }) {
    if (!this.letter) return;
    
    // Stop typing inmediatamente al enviar
    this.handleUserTyping(false);
    
    this.isSendingComment = true;
    this.letterService.commentOnLetter(this.letter.id, event.content, event.replyToId).subscribe({
      next: (updatedLetter) => {
        this.letter = updatedLetter;
        this.isSendingComment = false;
        this.letterChatService.updateLetter(updatedLetter); // Actualizar servicio
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error sending comment', err);
        this.isSendingComment = false;
        // Mostrar toast error
      }
    });
  }
  
  handleUserTyping(isTyping: boolean) {
    if (!this.letter) return;
    if (isTyping) {
      this.socketService.emitTyping(this.letter.id);
    } else {
      this.socketService.emitStopTyping(this.letter.id);
    }
  }
}
