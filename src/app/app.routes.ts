// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login';
import { HomePage } from './pages/home/home';
import { authGuard } from './core/auth-guard';
import { PhotoGalleryComponent } from './components/organisms/photo-gallery/photo-gallery';
import { LettersMenu } from './components/organisms/letter-menu/letter-menu';
import { LetterDetail } from './pages/letter-detail/letter-detail';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'home', component: HomePage, canActivate: [authGuard] },
  { path: 'photos', component: PhotoGalleryComponent, canActivate: [authGuard] },
  { path: 'letters', component: LettersMenu, canActivate: [authGuard] },
  { path: 'letter/:id', component: LetterDetail, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' }
];
