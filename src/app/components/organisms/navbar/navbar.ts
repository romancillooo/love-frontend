import { CommonModule, Location } from '@angular/common';
import { Component, effect, HostListener, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { PhotoService } from '../../../core/services/photo.service';
import { AlbumService } from '../../../core/services/album.service';
import { LetterService } from '../../../core/services/letter.service';
import { LoveLoaderService } from '../../../core/services/love-loader.service';
import { ImageUploaderComponent } from '../image-uploader/image-uploader';
import { AlbumCreatorComponent } from '../album-creator/album-creator';
import { LetterCreatorComponent } from '../letter-creator/letter-creator';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive, AlbumCreatorComponent, LetterCreatorComponent],
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
  batchActionsOpen = signal(false); // 🔹 Menú de acciones en lote (selección)
  showAlbumCreator = signal(false); // 🔹 Mostrar modal de crear álbum
  showLetterCreator = signal(false); // 🔹 Mostrar modal de crear carta
  isPhotosRoute = false;
  isLettersRoute = false;
  isSuperAdmin = signal(false);
  canCreateLetters = signal(false); // 🔹 Tanto superadmin como user pueden crear cartas
  isSelectionMode = signal(false);
  selectionCount = signal(0);

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
    private readonly letterService: LetterService,
    private readonly loaderService: LoveLoaderService,
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

    // Verificar rol del usuario
    this.checkUserRole();

    // 🔹 Suscribirse al estado de selección
    this.photoService.selectionMode$
      .pipe(filter(() => true)) // nos aseguramos de recibir valores
      .subscribe((isActive) => {
        this.isSelectionMode.set(isActive);
      });

    // 🔹 Suscribirse al conteo
    this.photoService.selectionCount$
      .pipe(filter(() => true))
      .subscribe((count) => {
        this.selectionCount.set(count);
      });
  }

  private checkUserRole() {
    const role = this.auth.getUserRole();
    const isSuperAdmin = this.auth.hasRole('superadmin');
    const isUser = this.auth.hasRole('user');
    
    // 🔹 Debug: ver qué rol tiene el usuario
    console.log('🔍 Rol del usuario:', role);
    console.log('🔍 ¿Es superadmin?', isSuperAdmin);
    console.log('🔍 ¿Es user?', isUser);
    
    this.isSuperAdmin.set(isSuperAdmin);
    // 🔹 Tanto superadmin como user pueden crear cartas
    this.canCreateLetters.set(isSuperAdmin || isUser);
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
    // Si estamos en modo selección, el botón funciona como cancelar
    if (this.isSelectionMode()) {
      this.photoService.setSelectionMode(false);
      return;
    }
    this.uploadMenuOpen.update((v) => !v);
  }

  closeUploadMenu() {
    this.uploadMenuOpen.set(false);
  }

  toggleBatchActions() {
    this.batchActionsOpen.update((v) => !v);
  }

  closeBatchActions() {
    this.batchActionsOpen.set(false);
  }

  requestBatchAddToAlbum() {
    this.closeBatchActions();
    this.photoService.requestBatchAddToAlbum();
  }

  requestBatchDownload() {
    this.closeBatchActions();
    this.photoService.requestBatchDownload();
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

  enableSelectionMode() {
    this.uploadMenuOpen.set(false); // Cerrar menú explícitamente sin animación de toggle
    this.photoService.setSelectionMode(true);
  }

  triggerBatchDelete() {
    this.photoService.requestBatchDelete();
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

  openLetterCreator() {
    this.showLetterCreator.set(true);
  }

  closeLetterCreator() {
    this.showLetterCreator.set(false);
  }

  onCreateLetter(letterData: {
    title: string;
    icon: string;
    content: string;
  }) {
    // Mostrar loader mientras se crea la carta
    this.loaderService.show('💌 Creando tu carta con todo mi amor...');

    this.letterService.createLetter(letterData).subscribe({
      next: (letter) => {
        console.log('✅ Carta creada:', letter);
        this.closeLetterCreator();
        // Refrescar la lista de cartas
        this.letterService.clearCacheAndRefresh();
        // Ocultar loader después de un pequeño delay para mostrar el mensaje de éxito
        setTimeout(() => {
          this.loaderService.hide();
        }, 800);
      },
      error: (err) => {
        console.error('❌ Error al crear carta:', err);
        // Ocultar loader en caso de error
        this.loaderService.hide();
      },
    });
  }

  private handleRouteChange(url: string) {
    this.isRouteAllowed = url !== '/login';
    this.activeNavRoute = this.resolveActiveRoute(url);
    this.currentTitle = this.resolveTitle(url);
    this.showBackButton = this.shouldShowBack(url);
    this.isPhotosRoute = url === '/photos';
    this.isLettersRoute = url === '/letters';
    
    // Re-verificar el rol cuando cambia la ruta (por si el token cambió)
    if (url === '/letters') {
      this.checkUserRole();
    }
    
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
