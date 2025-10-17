import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MemoriesService } from '../../../core/memories.service';
import { Letter } from '../../../core/models/letter';

@Component({
  selector: 'app-letters-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-menu.html',
  styleUrls: ['./letter-menu.scss']
})
export class LettersMenu implements OnInit, AfterViewInit, OnDestroy {
  readonly letters: Array<Letter & { preview: string }>;
  private navSub?: Subscription;
  private rafId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly memories: MemoriesService,
    private readonly scroller: ViewportScroller,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.letters = this.memories.getAllLetters().map(letter => ({
      ...letter,
      preview: this.memories.getLetterPreview(letter)
    }));
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // 🔹 Scroll al top también cuando se navega hacia /letters
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects.includes('/letters')) {
          this.forceScrollTop();
        }
      });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🔹 Scroll inicial al renderizar el componente
      this.forceScrollTop();
    }
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  openLetter(id: number) {
    this.router.navigate(['/letter', id]);
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
        doc.querySelector('.layout-content')
      ];

      candidates.forEach(t => {
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

    // 🔹 Pequeño defer para esperar el render
    setTimeout(() => tryScroll(0), 0);
  }
}
