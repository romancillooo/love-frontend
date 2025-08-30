import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'isLoggedIn';
  private readonly secretPassword = '190725';

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  login(pass: string): boolean {
    if (pass === this.secretPassword) {
      if (this.isBrowser()) {
        localStorage.setItem(this.STORAGE_KEY, 'true');
      }
      return true;
    }
    return false;
  }

  logout() {
    if (this.isBrowser()) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  get authenticated(): boolean {
    if (this.isBrowser()) {
      return localStorage.getItem(this.STORAGE_KEY) === 'true';
    }
    return false;
  }
}
