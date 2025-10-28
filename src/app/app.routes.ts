// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LettersMenu } from './components/organisms/letter-menu/letter-menu';
import { PhotoGalleryComponent } from './components/organisms/photo-gallery/photo-gallery';
import { authGuard } from './core/auth-guard';
import { HomePage } from './pages/home/home';
import { LetterDetail } from './pages/letter-detail/letter-detail';
import { LoginPage } from './pages/login/login';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'home', component: HomePage, canActivate: [authGuard] },
  { path: 'photos', component: PhotoGalleryComponent, canActivate: [authGuard] },
  { path: 'letters', component: LettersMenu, canActivate: [authGuard] },
  { path: 'letter/:id', component: LetterDetail, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
