import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login';
import { HomePage } from './pages/home/home';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'home', component: HomePage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
