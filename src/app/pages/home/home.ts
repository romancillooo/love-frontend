import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { AfterViewInit, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { PhotoService } from '../../core/services/photo.service';
import { LetterService } from '../../core/services/letter.service';
import { Letter } from '../../core/models/letter';
import { Photo } from '../../core/models/photo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  featuredPhotos: Photo[] = [];
  featuredLetter: Letter | undefined;
  featuredLetterPreview = '';

  private navSub?: Subscription;
  private rafId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly photoService: PhotoService,
    private readonly letterService: LetterService,
    private readonly scroller: ViewportScroller,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    // 🔹 Cargar fotos recientes (4 para desktop, 3 se mostrarán en mobile)
    this.photoService.getAllPhotos().subscribe((photos) => {
      this.featuredPhotos = photos.slice(0, 4);
    });

    // 🔹 Cargar carta destacada (siempre la más reciente)
    this.letterService.getAllLetters().subscribe((letters) => {
      // Filtrar cartas que tienen fecha y ordenar por más reciente
      const lettersWithDate = letters.filter((letter) => letter.createdAt);

      if (lettersWithDate.length > 0) {
        // Ordenar por fecha descendente (más reciente primero) por si acaso
        lettersWithDate.sort((a, b) => {
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
        });

        // Tomar la carta más reciente
        this.featuredLetter = lettersWithDate[0];
        this.featuredLetterPreview = this.letterService.getLetterPreview(this.featuredLetter, 120);
      } else if (letters.length > 0) {
        // Si ninguna carta tiene fecha, tomar la primera disponible
        this.featuredLetter = letters[0];
        this.featuredLetterPreview = this.letterService.getLetterPreview(this.featuredLetter, 120);
      }
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // 🔹 Detecta cuando se navega hacia /home
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
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
