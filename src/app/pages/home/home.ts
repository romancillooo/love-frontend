import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { PhotoService } from '../../core/services/photo.service';
import { LetterService } from '../../core/services/letter.service';
import { Letter } from '../../core/models/letter';
import { Photo } from '../../core/models/photo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage implements OnInit {
  featuredPhotos: Photo[] = [];
  featuredLetter: Letter | undefined;
  featuredLetterPreview = '';

  constructor(
    private readonly router: Router,
    private readonly photoService: PhotoService,
    private readonly letterService: LetterService,
  ) {
    // 🔹 Cargar fotos recientes (4 para desktop, 3 se mostrarán en mobile)
    this.photoService.getAllPhotos().subscribe({
      next: (photos) => {
        this.featuredPhotos = photos.slice(0, 4);
      },
      error: (err) => console.error('Error loading photos', err),
    });

    // 🔹 Cargar carta destacada (siempre la más reciente)
    this.letterService.getAllLetters().subscribe({
      next: (letters) => {
        // Filtrar cartas que tienen fecha y ordenar por más reciente
        const lettersWithDate = letters.filter((letter) => letter.createdAt);

        if (lettersWithDate.length > 0) {
          // Ordenar por fecha descendente (más reciente primero) por si acaso
          lettersWithDate.sort((a, b) => {
            return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
          });

          // Tomar la carta más reciente
          this.featuredLetter = lettersWithDate[0];
          this.featuredLetterPreview = this.letterService.getLetterPreview(this.featuredLetter, 120);
        } else if (letters.length > 0) {
          // Si ninguna carta tiene fecha, tomar la primera disponible
          this.featuredLetter = letters[0];
          this.featuredLetterPreview = this.letterService.getLetterPreview(this.featuredLetter, 120);
        }
      },
      error: (err) => console.error('Error loading letters', err),
    });
  }

  ngOnInit() {
    // Ya no es necesario lógica de scroll manual
  }

  // ---------- Navegación ----------
  goToPhotos() {
    this.router.navigate(['/photos']);
  }

  goToLetters() {
    this.router.navigate(['/letters']);
  }
}
