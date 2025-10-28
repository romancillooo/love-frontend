// src/app/core/auth-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (auth.authenticated) {
    return true;
  }

  return router.parseUrl('/login');
};
