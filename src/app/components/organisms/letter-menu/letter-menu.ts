// src/app/components/organisms/letter-menu/letter-menu.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { LetterService } from '../../../core/services/letter.service';
import { Letter } from '../../../core/models/letter';

@Component({
  selector: 'app-letters-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-menu.html',
  styleUrls: ['./letter-menu.scss'],
})
export class LettersMenu implements OnInit, OnDestroy {
  letters$: Observable<Array<Letter & { preview: string }>>;
  loadError = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly letterService: LetterService,
  ) {
    this.letters$ = this.createLettersStream();
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

  /** 🔹 Devuelve la clase CSS según el rol del creador */
  getLetterCardClass(letter: Letter): string {
    const role = letter.createdBy?.role;
    const username = letter.createdBy?.username;
    
    // Si tiene rol definido, usarlo
    if (role === 'user') {
      return 'letter-card letter-card--user';
    }
    
    // 🔹 Fallback: detectar por username (temporal hasta que el backend envíe role)
    // Usernames de superadmins (ajusta según tus usuarios)
    const superadminUsernames = ['romancillooo', 'bebitos'];
    
    if (username && !superadminUsernames.includes(username)) {
      return 'letter-card letter-card--user';
    }
    
    return 'letter-card'; // superadmin o sin rol definido
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
        console.log('📬 Cartas recibidas:', letters.map(l => ({
          title: l.title,
          createdBy: l.createdBy,
          role: l.createdBy?.role
        })));
      }),
      catchError((error) => {
        this.loadError = this.resolveError(error);
        return of<Array<Letter & { preview: string }>>([]);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
