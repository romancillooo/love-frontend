// src/app/components/organisms/letter-menu/letter-menu.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

import { LetterService } from '../../../core/services/letter.service';
import { Letter } from '../../../core/models/letter';
import { AuthService } from '../../../core/auth';
import { LoveLoaderService } from '../../../core/services/love-loader.service';

import { LetterCreatorComponent } from '../letter-creator/letter-creator';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';
import { ReactionBadgeComponent } from '../../molecules/reaction-badge/reaction-badge';
import { ReactionsDrawerComponent } from '../../molecules/reactions-drawer/reactions-drawer';

@Component({
  selector: 'app-letters-menu',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    LetterCreatorComponent, 
    ConfirmDialogComponent,
    ReactionBadgeComponent,
    ReactionsDrawerComponent
  ],
  templateUrl: './letter-menu.html',
  styleUrls: ['./letter-menu.scss'],
})
export class LettersMenu implements OnInit, OnDestroy {
  letters$: Observable<Array<Letter & { preview: string }>>;
  loadError = '';
  
  // 🔹 Estado para edición/eliminación
  editingLetter = signal<Letter | undefined>(undefined);
  deletingLetter = signal<Letter | undefined>(undefined);
  
  // 🔹 Estado para reacciones
  viewingReactionsLetter = signal<Letter | undefined>(undefined);

  showEditModal = signal(false);
  showDeleteConfirm = signal(false);

  private readonly destroy$ = new Subject<void>();
  private currentUser: { username: string; role: string } | null = null;

  constructor(
    private readonly router: Router,
    private readonly letterService: LetterService,
    private readonly auth: AuthService,
    private readonly loader: LoveLoaderService
  ) {
    this.letters$ = this.createLettersStream();
    this.currentUser = this.auth.getUser();
  }

  ngOnInit() {
    this.letterService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.letters$ = this.createLettersStream(true);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openLetter(id: string) {
    this.router.navigate(['/letter', id]);
  }

  // ========================================================
  // 🔐 Permisos
  // ========================================================
  canEdit(letter: Letter): boolean {
    if (!this.currentUser) return false;
    // Superadmin puede todo
    if (this.currentUser.role === 'superadmin') return true;
    // User solo puede editar las suyas
    return letter.createdBy?.username === this.currentUser.username;
  }

  canDelete(letter: Letter): boolean {
    return this.canEdit(letter); // Misma lógica por ahora
  }

  // ========================================================
  // ✏️ Edición
  // ========================================================
  onEdit(letter: Letter, event: Event) {
    event.stopPropagation(); // Evitar abrir la carta
    this.editingLetter.set(letter);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingLetter.set(undefined);
  }

  onUpdateLetter(data: { id: string; title: string; icon: string; content: string }) {
    this.loader.show('Guardando cambios...');
    this.letterService.updateLetter(data.id, data).subscribe({
      next: () => {
        this.loader.hide();
        this.closeEditModal();
        // El servicio ya hace refresh automático
      },
      error: (err) => {
        this.loader.hide();
        console.error('Error actualizando carta', err);
        // Aquí podrías mostrar un toast de error
      }
    });
  }

  // ========================================================
  // 🗑️ Eliminación
  // ========================================================
  onDelete(letter: Letter, event: Event) {
    event.stopPropagation(); // Evitar abrir la carta
    this.deletingLetter.set(letter);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deletingLetter.set(undefined);
  }

  confirmDelete() {
    const letter = this.deletingLetter();
    if (!letter) return;

    this.loader.show('Eliminando carta...');
    this.letterService.deleteLetter(letter.id).subscribe({
      next: () => {
        this.loader.hide();
        this.closeDeleteConfirm();
      },
      error: (err) => {
        this.loader.hide();
        console.error('Error eliminando carta', err);
      }
    });
  }

  // ========================================================
  // 😍 Reacciones
  // ========================================================
  openReactions(letter: Letter) {
    this.viewingReactionsLetter.set(letter);
  }

  closeReactions() {
    this.viewingReactionsLetter.set(undefined);
  }

  /** 🔹 Devuelve la clase CSS según el rol del creador */
  getLetterCardClass(letter: Letter): string {
    const role = letter.createdBy?.role;
    const username = letter.createdBy?.username;
    
    // Si tiene rol definido, usarlo
    if (role === 'user') {
      return 'letter-card letter-card--user';
    }
    
    // 🔹 Fallback: detectar por username (temporal hasta que el backend envíe role)
    const superadminUsernames = ['romancillooo', 'bebitos'];
    if (username && !superadminUsernames.includes(username)) {
      return 'letter-card letter-card--user';
    }
    
    return 'letter-card'; 
  }

  getBadgeVariant(letter: Letter): 'default' | 'user' {
    return this.getLetterCardClass(letter).includes('--user') ? 'user' : 'default';
  }

  private resolveError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'No pude cargar las cartas, intenta más tarde.';
  }

  private createLettersStream(
    forceRefresh = false,
  ): Observable<Array<Letter & { preview: string }>> {
    return this.letterService.getAllLetters(forceRefresh).pipe(
      map((letters) =>
        letters.map((letter) => ({
          ...letter,
          preview: this.letterService.getLetterPreview(letter),
        })),
      ),
      tap((letters) => {
        this.loadError = '';
        // 🔍 Debug: ver qué datos de createdBy están llegando
       // console.log('...debug info...');
      }),
      catchError((error) => {
        this.loadError = this.resolveError(error);
        return of<Array<Letter & { preview: string }>>([]);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
