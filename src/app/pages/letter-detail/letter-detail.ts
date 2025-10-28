// src/app/pages/letter-detail/letter-detail.ts
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subject, Subscription } from 'rxjs';
import { catchError, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { LetterService } from '../../core/services/letter.service';
import { Letter } from '../../core/models/letter';

@Component({
  selector: 'app-letter-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-detail.html',
  styleUrls: ['./letter-detail.scss'],
})
export class LetterDetail implements OnInit, AfterViewInit, OnDestroy {
  letter: Letter | undefined;
  displayText = '';
  isLoading = true;
  loadError = '';

  private typingIndex = 0;
  private lastTimestamp = 0;
  private animationId: number | null = null;
  private readonly stepDelay = 45; // ms
  private navSub?: Subscription;
  private rafId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly letterService: LetterService,
    private readonly scroller: ViewportScroller,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🔹 Scroll al top también cuando se navega hacia /letter/:id
      this.navSub = this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe((e: NavigationEnd) => {
          if (e.urlAfterRedirects.includes('/letter/')) {
            this.forceScrollTop();
          }
        });
    }

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
          this.startTypewriter();
        } else if (!this.loadError) {
          this.loadError = 'No encontré esta carta, intenta con otra.';
        }
      });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🔹 Scroll inicial al renderizar
      this.forceScrollTop();
    }
  }

  ngOnDestroy() {
    this.cancelAnimation();
    this.destroy$.next();
    this.destroy$.complete();
    this.navSub?.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
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

  // ---------- Scroll robusto al top ----------
  private forceScrollTop() {
    try {
      this.scroller.scrollToPosition([0, 0]);
    } catch {}

    const tryScroll = (attempt = 0) => {
      if (attempt > 10) return;

      const doc = document as Document;
      const candidates: (Window | Element | null)[] = [
        window,
        doc.scrollingElement,
        doc.documentElement,
        doc.body,
        doc.querySelector('main'),
        doc.querySelector('.content'),
        doc.querySelector('.scroll-container'),
        doc.querySelector('.app-content'),
        doc.querySelector('.page'),
        doc.querySelector('.layout-content'),
      ];

      candidates.forEach((t) => {
        if (!t) return;
        if (t === window) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } else {
          const el = t as HTMLElement;
          el.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
          (el as any).scrollTop = 0;
        }
      });

      const atTop =
        (window.scrollY ?? window.pageYOffset ?? 0) === 0 &&
        (doc.scrollingElement?.scrollTop ?? 0) === 0 &&
        (doc.documentElement?.scrollTop ?? 0) === 0 &&
        (doc.body?.scrollTop ?? 0) === 0;

      if (!atTop) {
        this.rafId = requestAnimationFrame(() => tryScroll(attempt + 1));
      }
    };

    setTimeout(() => tryScroll(0), 0);
  }
}
