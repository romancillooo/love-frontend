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
import { ReactionBadgeComponent } from '../../components/molecules/reaction-badge/reaction-badge';
import { ReactionsDrawerComponent } from '../../components/molecules/reactions-drawer/reactions-drawer';
import { EmojiPickerComponent } from '../../components/atoms/emoji-picker/emoji-picker';

@Component({
  selector: 'app-letter-detail',
  standalone: true,
  imports: [
    CommonModule, 
    ReactionBadgeComponent, 
    ReactionsDrawerComponent, 
    EmojiPickerComponent
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
  showEmojiPicker = false;
  currentUser: { username: string } | null = null;

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
    private readonly auth: AuthService
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
        } else if (!this.loadError) {
          this.loadError = 'No encontré esta carta, intenta con otra.';
        }
      });
  }

  ngOnDestroy() {
    this.cancelAnimation();
    this.destroy$.next();
    this.destroy$.complete();
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
}
