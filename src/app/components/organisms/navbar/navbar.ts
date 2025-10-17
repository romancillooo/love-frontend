import { Component, HostListener, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  isRouteAllowed = true;
  isVisible = true;
  showBackButton = false;
  activeNavRoute = '/home';
  currentTitle = 'Nuestros momentos';
  menuOpen = signal(false);

  readonly navigationLinks = [
    { label: 'Inicio', icon: 'favorite', route: '/home' },
    { label: 'Fotos', icon: 'photo_library', route: '/photos' },
    { label: 'Cartas', icon: 'mail', route: '/letters' }
  ];

  private lastScrollTop = 0;

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly auth: AuthService
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.handleRouteChange(event.urlAfterRedirects);
      });

    // 👇 Efecto para agregar o quitar clase del body automáticamente
    effect(() => {
      if (this.menuOpen()) {
        document.body.classList.add('menu-open');
      } else {
        document.body.classList.remove('menu-open');
      }
    });
  }

  @HostListener('window:scroll', [])
    onWindowScroll() {
      const st = window.pageYOffset || document.documentElement.scrollTop;

      // 🔹 Umbral mínimo para evitar micro-movimientos
      const delta = Math.abs(st - this.lastScrollTop);
      if (delta < 5) return;

      // 🔹 Solo ocultar si bajaste al menos 100px
      if (st > this.lastScrollTop && st > 100) {
        // scroll hacia abajo
        if (this.isVisible) {
          this.isVisible = false;
        }
      } else if (st < this.lastScrollTop) {
        // scroll hacia arriba
        if (!this.isVisible) {
          this.isVisible = true;
        }
      }

      this.lastScrollTop = st <= 0 ? 0 : st;
    }

  goBack() {
    this.location.back();
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }

  private handleRouteChange(url: string) {
    this.isRouteAllowed = url !== '/login';
    this.activeNavRoute = this.resolveActiveRoute(url);
    this.currentTitle = this.resolveTitle(url);
    this.showBackButton = this.shouldShowBack(url);
    this.closeMenu();
  }

  private resolveActiveRoute(url: string): string {
    if (url.startsWith('/letter')) return '/letters';
    return this.navigationLinks.some(link => link.route === url) ? url : '/home';
  }

  private resolveTitle(url: string): string {
    if (url.startsWith('/letter')) return 'Carta especial';
    const match = this.navigationLinks.find(link => link.route === url);
    return match ? match.label : 'Nuestros momentos';
  }

  private shouldShowBack(url: string): boolean {
    const defaultRoutes = this.navigationLinks.map(link => link.route);
    const hasHistory = typeof window !== 'undefined' ? window.history.length > 2 : false;
    return !defaultRoutes.includes(url) && url !== '/login' && hasHistory;
  }
}
