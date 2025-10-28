import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { buildApiUrl } from './api.config';
import { Letter } from './models/letter';
import { Photo } from './models/photo';

/* ---------- Interfaces del backend ---------- */
interface PhotoResponse {
  message: string;
  photos: PhotoDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface PhotoDTO {
  _id?: string;
  id?: string;
  url: string;
  format?: string;
  folder?: string;
  createdAt: string;
  originalName?: string;
  size?: number;
}

interface LetterListResponse {
  data: LetterDTO[];
}

interface LetterDTO {
  id: string;
  title: string;
  icon: string;
  content: string;
  createdAt?: string;
  legacyId?: number;
}

/* ---------- Servicio principal ---------- */
@Injectable({ providedIn: 'root' })
export class MemoriesService {
  private photos$?: Observable<Photo[]>;
  private letters$?: Observable<Letter[]>;

  constructor(private readonly http: HttpClient) {}

  /* 🔹 Obtiene todas las fotos */
  getAllPhotos(): Observable<Photo[]> {
    if (!this.photos$) {
      this.photos$ = this.http
        .get<PhotoResponse>(buildApiUrl('/photos'), {
          params: { limit: '200', page: '1' },
        })
        .pipe(
          map((response) => response.photos ?? []),
          map((dtos) => dtos.map((dto) => this.mapPhoto(dto))),
          map((photos) =>
            photos.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
          ),
          shareReplay({ bufferSize: 1, refCount: true }),
          catchError((err) => {
            console.error('Error fetching photos:', err);
            return of([]);
          }),
        );
    }
    return this.photos$;
  }

  /* 🔹 Obtiene años únicos de las fotos */
  getPhotoYears(): Observable<number[]> {
    return this.getAllPhotos().pipe(
      map((photos) => {
        const years = new Set<number>();
        photos.forEach((photo) => {
          if (photo.createdAt) {
            years.add(new Date(photo.createdAt).getFullYear());
          }
        });
        return Array.from(years).sort((a, b) => b - a);
      }),
    );
  }

  /* 🔹 Fotos recientes */
  getRecentPhotos(count = 4): Observable<Photo[]> {
    return this.getAllPhotos().pipe(map((photos) => photos.slice(0, count)));
  }

  /* 🔹 Cartas (sin cambios) */
  getAllLetters(): Observable<Letter[]> {
    if (!this.letters$) {
      this.letters$ = this.http
        .get<LetterListResponse>(buildApiUrl('/letters'), {
          params: { limit: '200', page: '1' },
        })
        .pipe(
          map((response) => response.data.map((dto) => this.mapLetter(dto))),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
    }
    return this.letters$;
  }

  getLetterById(id: string): Observable<Letter | undefined> {
    return this.http.get<LetterDTO>(buildApiUrl(`/letters/${id}`)).pipe(
      map((dto) => this.mapLetter(dto)),
      catchError((error) => {
        if (error?.status === 404) return of(undefined);
        return throwError(() => error);
      }),
    );
  }

  getLetterPreview(letter: Letter, maxLength = 110): string {
    const normalized = letter.content.replace(/\s+/g, ' ').trim();
    return normalized.length <= maxLength
      ? normalized
      : `${normalized.slice(0, maxLength).trimEnd()}…`;
  }

  /* ---------- Mapeos ---------- */
  private mapPhoto(dto: PhotoDTO): Photo {
    return {
      id: dto._id || dto.id || crypto.randomUUID(),
      description: dto.originalName ?? '',
      small: dto.url,
      large: dto.url,
      createdAt: dto.createdAt,
      tags: [],
    };
  }

  private mapLetter(dto: LetterDTO): Letter {
    return {
      id: dto.id,
      title: dto.title,
      icon: dto.icon,
      content: dto.content,
      createdAt: dto.createdAt,
      legacyId: dto.legacyId,
    };
  }
}
