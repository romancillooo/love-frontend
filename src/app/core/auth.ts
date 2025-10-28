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
