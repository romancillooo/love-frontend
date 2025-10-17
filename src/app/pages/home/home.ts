import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MemoriesService } from '../../core/memories.service';
import { Photo } from '../../core/models/photo';
import { Letter } from '../../core/models/letter';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage implements OnInit {
  readonly featuredPhotos: Photo[];
  readonly featuredLetter: Letter | undefined;
  readonly featuredLetterPreview: string;

  constructor(
    private readonly router: Router,
    private readonly memories: MemoriesService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.featuredPhotos = this.memories.getRecentPhotos(3);
    this.featuredLetter = this.memories.getAllLetters()[0];
    this.featuredLetterPreview = this.featuredLetter
      ? this.memories.getLetterPreview(this.featuredLetter, 120)
      : '';
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  goToPhotos() {
    this.router.navigate(['/photos']);
  }

  goToLetters() {
    this.router.navigate(['/letters']); // 🔥 ahora apunta al menú de cartas
  }
}
