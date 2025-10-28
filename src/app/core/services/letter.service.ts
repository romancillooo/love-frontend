// src/app/core/services/letter.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { buildApiUrl } from '../api.config';
import { Letter } from '../models/letter';

/* ---------- Interfaces ---------- */
interface LetterResponse {
  message: string;
  letters: LetterDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface LetterDTO {
  _id?: string;
  id?: string;
  title: string;
  icon: string;
  content: string;
  createdAt?: string;
  legacyId?: number;
}

/* ---------- Servicio principal ---------- */
@Injectable({
  providedIn: 'root',
})
export class LetterService {
  private readonly lettersUrl = buildApiUrl('letters');
  private letters$?: Observable<Letter[]>;

  /** 🔁 Subject para notificar actualizaciones */
  private readonly refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ========================================================
  // 💌 1. Obtener todas las cartas
  // ========================================================
  getAllLetters(forceRefresh = false): Observable<Letter[]> {
    if (!this.letters$ || forceRefresh) {
      this.letters$ = this.http
        .get<LetterResponse>(this.lettersUrl, {
          params: { limit: '200', page: '1', cacheBust: Date.now().toString() }, // 🔹 evita cache del navegador
        })
        .pipe(
          map((response) => response.letters ?? []),
          map((dtos) => dtos.map((dto) => this.mapLetter(dto))),
          map((letters) =>
            letters.sort((a, b) => {
              // Ordenar por fecha de creación (más recientes primero)
              if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }
              // Si no hay fecha, mantener orden original
              return 0;
            }),
          ),
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((err) => {
            console.error('❌ Error al obtener cartas:', err);
            return of([]);
          }),
        );
    }
    return this.letters$;
  }

  // ========================================================
  // 💌 2. Obtener una carta por ID
  // ========================================================
  getLetterById(id: string): Observable<Letter | undefined> {
    return this.getAllLetters().pipe(
      map((letters) => letters.find((letter) => letter.id === id)),
      catchError((err) => {
        console.error(`❌ Error al obtener carta ${id}:`, err);
        return of(undefined);
      }),
    );
  }

  // ========================================================
  // 📝 3. Obtener preview de una carta
  // ========================================================
  getLetterPreview(letter: Letter, maxLength = 110): string {
    const normalized = letter.content.replace(/\s+/g, ' ').trim();
    return normalized.length <= maxLength
      ? normalized
      : `${normalized.slice(0, maxLength).trimEnd()}…`;
  }

  // ========================================================
  // 🔄 4. Limpiar caché y notificar refresh
  // ========================================================
  clearCacheAndRefresh() {
    this.letters$ = undefined;
    this.refreshSubject.next();
  }

  // ========================================================
  // 🗺️ 5. Mapear datos desde backend
  // ========================================================
  private mapLetter(dto: LetterDTO): Letter {
    return {
      id: dto._id || dto.id || crypto.randomUUID(),
      title: dto.title,
      icon: dto.icon,
      content: dto.content,
      createdAt: dto.createdAt,
      legacyId: dto.legacyId,
    };
  }
}

