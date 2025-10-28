import { CommonModule, Location } from '@angular/common';
import { Component, effect, HostListener, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { PhotoService } from '../../../core/services/photo.service';
import { AlbumService } from '../../../core/services/album.service';
import { ImageUploaderComponent } from '../image-uploader/image-uploader';
import { AlbumCreatorComponent } from '../album-creator/album-creator';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive, AlbumCreatorComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class NavbarComponent {
  isRouteAllowed = true;
  isVisible = true;
  showBackButton = false;
  activeNavRoute = '/home';
  currentTitle = 'Nuestros momentos';
  menuOpen = signal(false);
  uploadMenuOpen = signal(false); // 🔹 Menú desplegable para subir contenido
  showAlbumCreator = signal(false); // 🔹 Mostrar modal de crear álbum
  isPhotosRoute = false;

  readonly navigationLinks = [
    { label: 'Inicio', icon: 'favorite', route: '/home' },
    { label: 'Fotos', icon: 'photo_library', route: '/photos' },
    { label: 'Cartas', icon: 'mail', route: '/letters' },
  ];

  private lastScrollTop = 0;

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog,
    private readonly albumService: AlbumService,
    private readonly photoService: PhotoService,
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
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
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }

  toggleUploadMenu() {
    this.uploadMenuOpen.update((v) => !v);
  }

  closeUploadMenu() {
    this.uploadMenuOpen.set(false);
  }

  openImageUploader() {
    this.closeUploadMenu();

    const dialogRef = this.dialog.open(ImageUploaderComponent, {
      width: '500px',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.length > 0) {
        console.log('🔄 Actualizando galería después de subir fotos');
        // 🔹 Pequeño delay para asegurar que el backend procesó las imágenes
        setTimeout(() => {
          this.photoService.clearCacheAndRefresh();
        }, 100);
      }
    });
  }

  openAlbumCreator() {
    this.closeUploadMenu();
    this.showAlbumCreator.set(true);
  }

  closeAlbumCreator() {
    this.showAlbumCreator.set(false);
  }

  onCreateAlbum(albumData: { name: string; description: string }) {
    this.albumService.createAlbum(albumData).subscribe({
      next: (album) => {
        console.log('✅ Álbum creado:', album);
        this.closeAlbumCreator();
      },
      error: (err) => {
        console.error('❌ Error al crear álbum:', err);
      },
    });
  }

  private handleRouteChange(url: string) {
    this.isRouteAllowed = url !== '/login';
    this.activeNavRoute = this.resolveActiveRoute(url);
    this.currentTitle = this.resolveTitle(url);
    this.showBackButton = this.shouldShowBack(url);
    this.isPhotosRoute = url === '/photos';
    this.closeMenu();
  }

  private resolveActiveRoute(url: string): string {
    if (url.startsWith('/letter')) return '/letters';
    return this.navigationLinks.some((link) => link.route === url) ? url : '/home';
  }

  private resolveTitle(url: string): string {
    if (url.startsWith('/letter')) return 'Carta especial';
    const match = this.navigationLinks.find((link) => link.route === url);
    return match ? match.label : 'Nuestros momentos';
  }

  private shouldShowBack(url: string): boolean {
    const defaultRoutes = this.navigationLinks.map((link) => link.route);
    const hasHistory = typeof window !== 'undefined' ? window.history.length > 2 : false;
    return !defaultRoutes.includes(url) && url !== '/login' && hasHistory;
  }
}
