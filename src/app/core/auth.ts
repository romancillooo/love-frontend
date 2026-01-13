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
   * Obtiene el payload completo del token decodificado
   */
  getDecodedToken(): any | null {
    const token = this.token;
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Obtiene el usuario actual (username, role, email, id)
   */
  getUser(): { username: string; role: string; email: string; id: string } | null {
    const payload = this.getDecodedToken();
    if (!payload) return null;

    return {
      username: payload.username || payload.user?.username,
      role: payload.role || payload.roles || payload.userRole || payload.user?.role,
      email: payload.email || payload.user?.email,
      id: payload.sub || payload.id || payload.user?.id,
    };
  }

  /**
   * Obtiene el rol del usuario desde el token JWT
   */
  getUserRole(): string | null {
    const user = this.getUser();
    return user?.role || null;
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
