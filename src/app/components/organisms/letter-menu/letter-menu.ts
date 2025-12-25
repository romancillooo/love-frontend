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
      tap(() => {
        this.loadError = '';
      }),
      catchError((error) => {
        this.loadError = this.resolveError(error);
        return of<Array<Letter & { preview: string }>>([]);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
