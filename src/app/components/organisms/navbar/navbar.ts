import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common'; // 👈 import Location
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
  isRouteAllowed = true;  // 👈 controla si se debe renderizar
  isVisible = true;       // 👈 controla si está visible por scroll
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
    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.handleRouteChange(event.urlAfterRedirects);
      });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;

    if (st > this.lastScrollTop) {
      // 👇 scroll hacia abajo → ocultar
      this.isVisible = false;
    } else {
      // 👆 scroll hacia arriba → mostrar
      this.isVisible = true;
    }

    this.lastScrollTop = st <= 0 ? 0 : st;
  }

  goBack() {
    this.location.back();
  }

  toggleMenu() {
    this.menuOpen.update(value => !value);
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
    if (url.startsWith('/letter')) {
      return '/letters';
    }
    return this.navigationLinks.some(link => link.route === url) ? url : '/home';
  }

  private resolveTitle(url: string): string {
    if (url.startsWith('/letter')) {
      return 'Carta especial';
    }

    const match = this.navigationLinks.find(link => link.route === url);
    return match ? match.label : 'Nuestros momentos';
  }

  private shouldShowBack(url: string): boolean {
    const defaultRoutes = this.navigationLinks.map(link => link.route);
    const hasHistory = typeof window !== 'undefined' ? window.history.length > 2 : false;
    return !defaultRoutes.includes(url) && url !== '/login' && hasHistory;
  }
}
