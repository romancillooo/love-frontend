// src/app/core/services/photo.service.ts
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { buildApiUrl } from '../api.config';
import { Photo } from '../models/photo';

/* ---------- Interfaces ---------- */
export interface UploadedPhoto {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

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
  isFavorite?: boolean; // 🔹 Campo de favorito
}

/* ---------- Servicio principal ---------- */
@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private readonly uploadUrl = buildApiUrl('upload/images');
  private readonly photosUrl = buildApiUrl('photos');
  private photos$?: Observable<Photo[]>;

  /** 🔁 Subject para notificar actualizaciones (upload/delete) */
  private readonly refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  /** 🔹 Estado del modo de selección (comunicación navbar -> galería) */
  private readonly selectionModeSubject = new Subject<boolean>();
  selectionMode$ = this.selectionModeSubject.asObservable();

  /** 🔹 Conteo de items seleccionados */
  private readonly selectionCountSubject = new BehaviorSubject<number>(0);
  selectionCount$ = this.selectionCountSubject.asObservable();

  /** 🔹 Trigger para solicitar borrado desde el navbar */
  private readonly deleteRequestSubject = new Subject<void>();
  deleteRequest$ = this.deleteRequestSubject.asObservable();

  /** 🔹 Trigger para solicitar agregar a álbum en lote */
  private readonly batchAddToAlbumRequestSubject = new Subject<void>();
  batchAddToAlbumRequest$ = this.batchAddToAlbumRequestSubject.asObservable();

  /** 🔹 Trigger para solicitar descarga en lote */
  private readonly batchDownloadRequestSubject = new Subject<void>();
  batchDownloadRequest$ = this.batchDownloadRequestSubject.asObservable();

  constructor(private http: HttpClient) {}

  setSelectionMode(isActive: boolean) {
    this.selectionModeSubject.next(isActive);
    if (!isActive) {
      this.selectionCountSubject.next(0); // Reset count on exit
    }
  }

  updateSelectionCount(count: number) {
    this.selectionCountSubject.next(count);
  }

  requestBatchDelete() {
    this.deleteRequestSubject.next();
  }

  requestBatchAddToAlbum() {
    this.batchAddToAlbumRequestSubject.next();
  }

  requestBatchDownload() {
    this.batchDownloadRequestSubject.next();
  }

  // ========================================================
  // 📸 1. Obtener todas las fotos
  // ========================================================
  getAllPhotos(forceRefresh = false): Observable<Photo[]> {
    if (!this.photos$ || forceRefresh) {
      this.photos$ = this.http
        .get<PhotoResponse>(this.photosUrl, {
          params: { limit: '200', page: '1', cacheBust: Date.now().toString() }, // 🔹 evita cache del navegador
        })
        .pipe(
          map((response) => response.photos ?? []),
          map((dtos) => dtos.map((dto) => this.mapPhoto(dto))),
          map((photos) =>
            photos.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
          ),
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((err) => {
            console.error('Error fetching photos:', err);
            return of([]);
          }),
        );
    }
    return this.photos$;
  }

  // ========================================================
  // 🗓️ 2. Obtener años únicos
  // ========================================================
  getPhotoYears(forceRefresh = false): Observable<number[]> {
    return this.getAllPhotos(forceRefresh).pipe(
      // 👈 cambia aquí
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

  // ========================================================
  // 📤 3. Subir nuevas fotos (notifica refresh$ al finalizar)
  // ========================================================
  uploadPhotos(files: File[], folder = 'photos', creationDates?: string[]): Observable<UploadedPhoto[]> {
    const formData = new FormData();
    for (const file of files) formData.append('images', file);

    if (creationDates && creationDates.length > 0) {
      creationDates.forEach((date) => formData.append('creationDates[]', date));
    }

    return new Observable(observer => {
      this.http
        .post<{ photos: UploadedPhoto[] }>(
          `${this.uploadUrl}?folder=${folder}`,
          formData,
          { reportProgress: true, observe: 'events' }
        )
        .subscribe({
          next: event => {
            if (event.type === HttpEventType.Response) {
              const uploaded = event.body?.photos || [];

              // 🔹 No llamamos clearCacheAndRefresh() aquí para evitar timing issues
              // El componente que abre el diálogo se encargará de refrescar

              observer.next(uploaded);
              observer.complete();
            }
          },
          error: err => observer.error(err)
        });
    });
  }

  // ========================================================
  // 🗑️ 4. Eliminar foto (backend + GCS) y notificar refresh$
  // ========================================================
  deletePhoto(id: string): Observable<{ message: string; id: string; url: string }> {
    return new Observable((observer) => {
      this.http
        .delete<{ message: string; id: string; url: string }>(`${this.photosUrl}/${id}`)
        .subscribe({
          next: (res) => {
            this.clearCacheAndRefresh();
            observer.next(res);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
    });
  }

  // 🔹 Eliminar múltiples fotos (Batch Delete)
  deletePhotosBatch(ids: string[]): Observable<{ message: string; count: number }> {
    const url = buildApiUrl('photos/batch-delete');
    return new Observable((observer) => {
      this.http.post<{ message: string; count: number }>(url, { ids }).subscribe({
        next: (res) => {
          this.clearCacheAndRefresh();
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  // ========================================================
  // ❤️ 5. Alternar favorito (agregar/quitar de favoritos)
  // ========================================================
  toggleFavorite(id: string, isFavorite: boolean): Observable<Photo> {
    return this.http
      .patch<{ photo: PhotoDTO }>(`${this.photosUrl}/${id}`, { isFavorite })
      .pipe(
        map((response) => {
          const photo = this.mapPhoto(response.photo);
          // 🔹 Solo limpiar cache, NO emitir refresh (para no cerrar el preview)
          this.photos$ = undefined;
          return photo;
        }),
        catchError((err) => {
          console.error('❌ Error al actualizar favorito:', err);
          throw err;
        }),
      );
  }

  // ========================================================
  // 💾 6. Descargar foto
  // ========================================================
  downloadPhoto(id: string): Observable<Blob> {
    return this.http
      .get(`${this.photosUrl}/${id}/download`, {
        responseType: 'blob',
      })
      .pipe(
        catchError((err) => {
          console.error('❌ Error al descargar foto:', err);
          throw err;
        }),
      );
  }

  clearCacheAndRefresh() {
    this.photos$ = undefined;
    this.refreshSubject.next();
  }

  // ========================================================
  // 🔄 5. Mapear datos desde backend
  // ========================================================
  private mapPhoto(dto: PhotoDTO): Photo {
    return {
      id: dto._id || dto.id || crypto.randomUUID(),
      description: dto.originalName ?? '',
      small: dto.url,
      large: dto.url,
      createdAt: dto.createdAt,
      tags: [],
      isFavorite: dto.isFavorite ?? false, // 🔹 Mapear favorito (por defecto false)
    };
  }
}
