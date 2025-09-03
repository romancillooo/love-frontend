import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login';
import { HomePage } from './pages/home/home';
import { authGuard } from './core/auth-guard';

// Importamos las nuevas páginas
import { PhotoGalleryComponent } from './components/organisms/photo-gallery/photo-gallery';
import { LetterPage } from './pages/letter/letter';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'home', component: HomePage, canActivate: [authGuard] },
  { path: 'photos', component: PhotoGalleryComponent, canActivate: [authGuard] },
  { path: 'letter', component: LetterPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
