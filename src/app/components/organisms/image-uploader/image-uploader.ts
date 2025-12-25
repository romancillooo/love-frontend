// src/app/components/organisms/image-uploader/image-uploader.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import * as exifr from 'exifr';
import { Photo } from '../../../core/models/photo';
import { PhotoService, UploadedPhoto } from '../../../core/services/photo.service';
import { LoveLoaderComponent } from '../../shared/love-loader/love-loader';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    LoveLoaderComponent,
  ],
  templateUrl: './image-uploader.html',
  styleUrls: ['./image-uploader.scss'],
})
export class ImageUploaderComponent implements OnDestroy {
  files: File[] = [];
  previews = new Map<File, string>();
  safePreviews = new Map<File, SafeUrl>();
  metadata = new Map<File, Date>();
  isDragging = false;
  isUploading = false;
  isLoaderVisible = false;
  loaderMessage: string = '💌 Subiendo tus recuerdos...';
  readonly MAX_FILES = 10;
  isProcessingFiles = false;

  activeIndex: number | null = null;
  activePhoto: Photo | null = null;

  constructor(
    public dialogRef: MatDialogRef<ImageUploaderComponent>,
    private cdr: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer,
    private photoService: PhotoService,
  ) {}

  // 🔹 Drag & Drop
  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (this.files.length < this.MAX_FILES) this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files) this.handleFiles(files);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.handleFiles(input.files);
  }

  // 🔹 Procesamiento de archivos (crea previews y lee metadatos)
  async handleFiles(fileList: FileList) {
    if (fileList.length === 0) return;

    this.isProcessingFiles = true;
    this.loaderMessage = '✨ Preparando tus recuerdos...';
    this.isLoaderVisible = true;
    this.cdr.detectChanges();

    const remaining = this.MAX_FILES - this.files.length;
    const filesToAdd = Array.from(fileList).slice(0, remaining);

    const fileDataArray = await Promise.all(
      filesToAdd.map(async (file) => {
        let previewUrl = URL.createObjectURL(file);
        let date: Date;

        const fileNameLower = file.name.toLowerCase();
        const isHeic =
          file.type === 'image/heic' ||
          file.type === 'image/heif' ||
          fileNameLower.endsWith('.heic') ||
          fileNameLower.endsWith('.heif');

        if (isHeic) {
          const originalPreview = previewUrl;
          try {
            const module = await import('heic2any');
            const heic2any = (module as any).default || module;
            const conversionResult = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.92,
            });
            const convertedBlob = Array.isArray(conversionResult)
              ? conversionResult[0]
              : (conversionResult as Blob);
            previewUrl = URL.createObjectURL(convertedBlob);
            URL.revokeObjectURL(originalPreview);
            console.log('[ImageUploader] Converted HEIC to JPEG for preview', {
              name: file.name,
              originalType: file.type,
              convertedSize: convertedBlob.size,
              previewUrl,
            });
          } catch (error) {
            console.warn('[ImageUploader] Failed to convert HEIC for preview, using original blob', error);
            previewUrl = originalPreview;
          }
        }

        try {
          const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
          date = exifData?.DateTimeOriginal || exifData?.CreateDate || new Date(file.lastModified);
        } catch {
          date = new Date(file.lastModified);
        }

        console.log('[ImageUploader] Generated preview URL', {
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl,
          exifDate: date.toISOString(),
        });

        return { file, previewUrl, date };
      }),
    );

    for (const { file, previewUrl, date } of fileDataArray) {
      this.files.push(file);
      this.previews.set(file, previewUrl);
      this.safePreviews.set(file, this.sanitizer.bypassSecurityTrustUrl(previewUrl));
      this.metadata.set(file, date);
    }

    this.cdr.detectChanges();

    this.isProcessingFiles = false;
    this.isLoaderVisible = false;
    this.loaderMessage = '💌 Subiendo tus recuerdos...';
    this.cdr.detectChanges();
  }

  getFilePreview(file: File): SafeUrl | string {
    return this.safePreviews.get(file) ?? this.previews.get(file) ?? '';
  }

  removeFile(file: File) {
    const preview = this.previews.get(file);
    if (preview) URL.revokeObjectURL(preview);
    this.previews.delete(file);
    this.safePreviews.delete(file);
    this.metadata.delete(file);
    console.log('[ImageUploader] Removed file from queue', { name: file.name, type: file.type });
    this.files = this.files.filter((f) => f !== file);
    this.cdr.detectChanges();
  }

  // 🔹 Vista previa interactiva
  openPreview(file: File) {
    this.activeIndex = this.files.indexOf(file);
    this.updateActivePhoto();
  }

  nextPhoto() {
    if (this.activeIndex === null) return;
    if (this.activeIndex < this.files.length - 1) {
      this.activeIndex++;
      this.updateActivePhoto();
    }
  }

  previousPhoto() {
    if (this.activeIndex === null) return;
    if (this.activeIndex > 0) {
      this.activeIndex--;
      this.updateActivePhoto();
    }
  }

  private updateActivePhoto() {
    if (this.activeIndex === null) return;
    const file = this.files[this.activeIndex];
    const src = this.previews.get(file) || '';
    const date = this.metadata.get(file) || new Date(file.lastModified);

    console.log('[ImageUploader] Opening preview', {
      name: file.name,
      type: file.type,
      src,
      date: date.toISOString(),
    });

    this.activePhoto = {
      id: crypto.randomUUID(),
      small: src,
      large: src,
      description: file.name,
      createdAt: date.toISOString(),
      tags: [],
    };

    this.cdr.detectChanges();
  }

  closePreview() {
    console.log('[ImageUploader] Closing preview');
    this.activePhoto = null;
    this.activeIndex = null;
    this.cdr.detectChanges();
  }

  // 🚀 Subir fotos al backend
  async uploadFiles() {
    if (this.files.length === 0) return;

    this.isLoaderVisible = true;
    this.isUploading = true;

    // 🔹 Mensaje inicial de compresión
    this.loaderMessage = '⚡ Optimizando tus fotos para subir rapídisimo...';
    this.cdr.detectChanges();

    const compressedFiles: File[] = [];
    const creationDates: string[] = [];

    // 🔹 Configuración de compresión
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    };

    try {
      // 🔹 Importación dinámica para code-splitting
      const imageCompression = (await import('browser-image-compression')).default;

      // 🔹 Comprimir cada archivo
      for (const file of this.files) {
        console.log(`[Compression] Original: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        // Recolectar fecha original (metadata ya tiene la fecha extraída en handleFiles)
        const originalDate = this.metadata.get(file);
        creationDates.push(originalDate ? originalDate.toISOString() : new Date().toISOString());

        try {
          const compressedBlob = await imageCompression(file, options);
          const compressedFile = new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: file.lastModified,
          });
          console.log(`[Compression] Compressed: ${compressedFile.name} - ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
          compressedFiles.push(compressedFile);
        } catch (error) {
          console.warn(`[Compression] Failed for ${file.name}, using original.`, error);
          compressedFiles.push(file);
        }
      }

      // 🔹 Mensaje de subida
      this.loaderMessage = '💌 Subiendo tus recuerdos...';
      this.cdr.detectChanges();

      this.photoService.uploadPhotos(compressedFiles, 'memories', creationDates).subscribe({
        next: (photos: UploadedPhoto[]) => {
          console.log('✅ Fotos subidas:', photos);

          // 💬 Cambiamos mensaje para feedback visual
          this.loaderMessage = '🎉 Fotos subidas con éxito, actualizando galería...';
          this.cdr.detectChanges();

          // 🔁 Espera 800ms antes de cerrar para mostrar el mensaje
          setTimeout(() => {
            this.isLoaderVisible = false;
            this.isUploading = false;
            this.dialogRef.close(photos); // Devuelve las fotos subidas
            this.cdr.detectChanges();
          }, 800);
        },
        error: err => {
          console.error('❌ Error subiendo fotos:', err);
          this.loaderMessage = '😢 Hubo un error subiendo tus recuerdos.';
          this.isUploading = false;

          // Espera un poco y oculta el loader para que se vea el mensaje
          setTimeout(() => {
            this.isLoaderVisible = false;
            this.cdr.detectChanges();
          }, 2000);
        }
      });

    } catch (error) {
      console.error('❌ Error general en compresión:', error);
      this.loaderMessage = '😢 Error preparando las fotos.';
      this.isUploading = false;
      setTimeout(() => {
        this.isLoaderVisible = false;
        this.cdr.detectChanges();
      }, 2000);
    }
  }

  closeDialog() {
    this.previews.forEach((url) => URL.revokeObjectURL(url));
    this.previews.clear();
    this.safePreviews.clear();
    this.metadata.clear();
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.previews.forEach((url) => URL.revokeObjectURL(url));
    this.previews.clear();
    this.metadata.clear();
  }
}
