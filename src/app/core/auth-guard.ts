// src/app/core/auth-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);

  const win = typeof window !== 'undefined' ? window : null;
  let hasSecretKey = false;

  if (win) {
    try {
      hasSecretKey = !!win.localStorage?.getItem('love_secret_key');
    } catch {
      hasSecretKey = false;
    }
  }

  if (hasSecretKey) {
    return true;
  }

  /** parseUrl evita side-effects durante SSR mientras forzamos /login */
  return router.parseUrl('/login');
};
