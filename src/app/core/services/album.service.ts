// src/app/core/services/album.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { buildApiUrl } from '../api.config';
import { Album } from '../models/album';

type AlbumPayload = {
  name?: string;
  description?: string;
  coverPhotoUrl?: string | null;
  photoIds?: string[];
};

interface AddPhotoResponse {
  message: string;
  photoId: string;
  albums: Array<{
    id: string;
    name: string;
    photoCount: number;
  }>;
}

interface RemovePhotoResponse {
  message: string;
  albumId: string;
  photoId: string;
  photoCount: number;
}

interface AlbumResponse {
  message: string;
  albums: AlbumDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface AlbumDTO {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  coverPhotoUrl?: string;
  photoIds?: string[];
  photoCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AlbumService {
  private readonly albumsUrl = buildApiUrl('albums');
  private albums$?: Observable<Album[]>;

  private readonly refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  /**
   * 📚 Obtener todos los álbumes (con cache y opción de refresco)
   */
  getAllAlbums(forceRefresh = false): Observable<Album[]> {
    if (!this.albums$ || forceRefresh) {
      this.albums$ = this.http
        .get<AlbumResponse>(this.albumsUrl, {
          params: { limit: '200', page: '1', cacheBust: Date.now().toString() },
        })
        .pipe(
          map((response) => response.albums ?? []),
          map((dtos) => dtos.map((dto) => this.mapAlbum(dto))),
          map((albums) =>
            albums.sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            }),
          ),
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((err) => {
            console.error('❌ Error fetching albums:', err);
            return of([]);
          }),
        );
    }

    return this.albums$;
  }

  /**
   * 🔍 Obtener un álbum por ID utilizando la cache local.
   */
  getAlbumById(id: string): Observable<Album | undefined> {
    return this.getAllAlbums().pipe(
      map((albums) => albums.find((album) => album.id === id)),
      catchError((err) => {
        console.error(`❌ Error fetching album ${id}:`, err);
        return of(undefined);
      }),
    );
  }

  /**
   * ✨ Crear un nuevo álbum.
   */
  createAlbum(payload: Required<Pick<AlbumPayload, 'name'>> & AlbumPayload): Observable<Album> {
    const body = this.normalizePayload(payload);

    return this.http.post<{ album: AlbumDTO }>(this.albumsUrl, body).pipe(
      map((response) => this.mapAlbum(response.album)),
      tap(() => this.clearCacheAndRefresh()),
      catchError((err) => {
        console.error('❌ Error creating album:', err);
        throw err;
      }),
    );
  }

  /**
   * 🛠️ Actualizar un álbum existente.
   */
  updateAlbum(id: string, updates: AlbumPayload): Observable<Album> {
    const body = this.normalizePayload(updates);

    return this.http.patch<{ album: AlbumDTO }>(`${this.albumsUrl}/${id}`, body).pipe(
      map((response) => this.mapAlbum(response.album)),
      tap(() => this.clearCacheAndRefresh()),
      catchError((err) => {
        console.error(`❌ Error updating album ${id}:`, err);
        throw err;
      }),
    );
  }

  /**
   * 🗑️ Eliminar un álbum.
   */
  deleteAlbum(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.albumsUrl}/${id}`).pipe(
      tap(() => this.clearCacheAndRefresh()),
      catchError((err) => {
        console.error(`❌ Error deleting album ${id}:`, err);
        throw err;
      }),
    );
  }

  addPhotoToAlbums(photoId: string, albumIds: string[]): Observable<AddPhotoResponse> {
    return this.http
      .post<AddPhotoResponse>(`${this.albumsUrl}/add-photo`, { photoId, albumIds })
      .pipe(
        tap(() => this.clearCacheAndRefresh()),
        catchError((err) => {
          console.error('❌ Error adding photo to albums:', err);
          throw err;
        }),
      );
  }

  removePhotoFromAlbum(albumId: string, photoId: string): Observable<RemovePhotoResponse> {
    return this.http
      .post<RemovePhotoResponse>(`${this.albumsUrl}/remove-photo`, { albumId, photoId })
      .pipe(
        tap(() => this.clearCacheAndRefresh()),
        catchError((err) => {
          console.error('❌ Error removing photo from album:', err);
          throw err;
        }),
      );
  }

  /**
   * 🔄 Limpiar cache y notificar a los suscriptores.
   */
  clearCacheAndRefresh() {
    this.albums$ = undefined;
    this.refreshSubject.next();
  }

  private normalizePayload(payload: AlbumPayload): AlbumPayload {
    const body: AlbumPayload = {};

    if (payload.name !== undefined) {
      body.name =
        typeof payload.name === 'string'
          ? payload.name.trim().slice(0, 50)
          : payload.name;
    }

    if (payload.description !== undefined) {
      body.description =
        typeof payload.description === 'string'
          ? payload.description.trim().slice(0, 200)
          : payload.description;
    }

    if (payload.coverPhotoUrl !== undefined) {
      if (payload.coverPhotoUrl === null) {
        body.coverPhotoUrl = null;
      } else {
        body.coverPhotoUrl = payload.coverPhotoUrl.trim();
      }
    }

    if (payload.photoIds !== undefined) {
      body.photoIds = payload.photoIds
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());
    }

    return body;
  }

  private mapAlbum(dto: AlbumDTO): Album {
    const normalizedName = dto.name?.trim() ?? '';
    const normalizedDescription = dto.description?.trim() ?? '';
    const normalizedCover = dto.coverPhotoUrl?.trim();

    const normalizedPhotoIds = Array.isArray(dto.photoIds)
      ? dto.photoIds.map((id) => id.toString())
      : [];

    return {
      id: dto._id || dto.id || crypto.randomUUID(),
      name: normalizedName,
      description: normalizedDescription,
      coverPhotoUrl: normalizedCover && normalizedCover.length > 0 ? normalizedCover : undefined,
      photoIds: normalizedPhotoIds,
      photoCount: typeof dto.photoCount === 'number' ? dto.photoCount : normalizedPhotoIds.length,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }
}
