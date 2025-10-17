import {
  Component,
  Inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { MemoriesService } from '../../core/memories.service';
import { Photo } from '../../core/models/photo';
import { Letter } from '../../core/models/letter';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  readonly featuredPhotos: Photo[];
  readonly featuredLetter: Letter | undefined;
  readonly featuredLetterPreview: string;

  private navSub?: Subscription;
  private rafId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly memories: MemoriesService,
    private readonly scroller: ViewportScroller,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.featuredPhotos = this.memories.getRecentPhotos(3);
    this.featuredLetter = this.memories.getAllLetters()[0];
    this.featuredLetterPreview = this.featuredLetter
      ? this.memories.getLetterPreview(this.featuredLetter, 120)
      : '';
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // 🔹 Detecta cuando se navega hacia /home
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects === '/home' || e.urlAfterRedirects === '/') {
          this.forceScrollTop();
        }
      });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // 🔹 Scroll inicial al renderizar home
    this.forceScrollTop();
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ---------- Navegación ----------
  goToPhotos() {
    this.router.navigate(['/photos']);
  }

  goToLetters() {
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

    setTimeout(() => tryScroll(0), 0);
  }
}
