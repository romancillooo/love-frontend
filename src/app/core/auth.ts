// src/app/core/auth.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'love_secret_key';
  private readonly secretPassword = this.resolveSecret();

  /**
   * 🚦 Lee la contraseña desde variables de entorno cuando existen y
   *    garantiza un valor por defecto sin romper en navegadores que
   *    no exponen `import.meta.env`.
   */
  private resolveSecret(): string {
    const env = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
    const raw =
      env?.NG_APP_SECRET_PASSWORD ??
      env?.['NG_APP_SECRET_PASSWORD'] ?? // compatibilidad por índice
      '';

    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : '190725';
  }

  /** ✅ Verificación más directa para evitar timing issues */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /** ✅ Login: guarda sesión */
  login(pass: string): boolean {
    if (pass === this.secretPassword) {
      if (this.isBrowser()) {
        localStorage.setItem(this.STORAGE_KEY, pass);
      }
      return true;
    }
    return false;
  }

  /** ✅ Logout: borra sesión */
  logout() {
    if (this.isBrowser()) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /** ✅ Getter robusto (aunque el guard usará lectura directa) */
  get authenticated(): boolean {
    return this.isBrowser() && !!localStorage.getItem(this.STORAGE_KEY);
  }
}
