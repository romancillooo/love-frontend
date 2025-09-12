import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  isRouteAllowed = true;  // 👈 controla si se debe renderizar
  isVisible = true;       // 👈 controla si está visible por scroll
  private lastScrollTop = 0;

  constructor(private router: Router) {
    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const currentUrl = event.urlAfterRedirects;
        // Ocultar completamente en login y home
        this.isRouteAllowed = !(currentUrl === '/login' || currentUrl === '/home');
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

  goHome() {
    this.router.navigate(['/home']);
  }
}
