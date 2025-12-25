// src/app/core/auth.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { buildApiUrl, resolveApiUrl } from './api.config';

interface AuthResponse {
  token: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'love_auth_token';
  private cachedToken: string | null = this.restoreToken();

  constructor(private readonly http: HttpClient) {}

  login(identifier: string, password: string): Observable<void> {
    return this.http.post<AuthResponse>(buildApiUrl('/auth/login'), { identifier, password }).pipe(
      tap((response) => this.persistToken(response.token)),
      map(() => void 0),
    );
  }

  logout(): void {
    this.clearToken();
  }

  get authenticated(): boolean {
    return !!this.token;
  }

  get token(): string | null {
    if (this.cachedToken) {
      return this.cachedToken;
    }
    return this.restoreToken();
  }

  get apiBaseUrl(): string {
    return resolveApiUrl();
  }

  /**
   * Obtiene el rol del usuario desde el token JWT
   */
  getUserRole(): string | null {
    const token = this.token;
    if (!token) {
      console.log('🔍 No hay token disponible');
      return null;
    }

    try {
      // JWT tiene formato: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('🔍 Token no tiene formato JWT válido');
        return null;
      }

      // Decodificar el payload (base64url)
      const payload = parts[1];
      // Reemplazar caracteres base64url por base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = atob(padded);
      const parsed = JSON.parse(decoded);

      // 🔹 Debug: mostrar el payload completo
      console.log('🔍 Payload del JWT:', parsed);
      
      // Intentar diferentes nombres de propiedad para el rol
      const role = parsed.role || parsed.roles || parsed.userRole || parsed.user?.role || null;
      
      console.log('🔍 Rol encontrado:', role);
      
      return role;
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario tiene el rol especificado
   */
  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  private persistToken(token: string): void {
    this.cachedToken = token;
    if (!this.hasStorage()) return;
    try {
      window.localStorage.setItem(this.STORAGE_KEY, token);
    } catch {
      // localStorage no disponible
    }
  }

  private clearToken(): void {
    this.cachedToken = null;
    if (!this.hasStorage()) return;
    try {
      window.localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // localStorage no disponible
    }
  }

  private restoreToken(): string | null {
    if (!this.hasStorage()) {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      this.cachedToken = stored;
      return stored;
    } catch {
      return null;
    }
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
