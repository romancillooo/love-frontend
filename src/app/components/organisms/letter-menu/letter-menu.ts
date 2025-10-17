import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MemoriesService } from '../../../core/memories.service';
import { Letter } from '../../../core/models/letter';

@Component({
  selector: 'app-letters-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-menu.html',
  styleUrls: ['./letter-menu.scss']
})
export class LettersMenu implements OnInit {
  readonly letters: Array<Letter & { preview: string }>;

  constructor(private readonly router: Router, private readonly memories: MemoriesService) {
    this.letters = this.memories.getAllLetters().map(letter => ({
      ...letter,
      preview: this.memories.getLetterPreview(letter)
    }));
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  openLetter(id: number) {
    this.router.navigate(['/letter', id]);
  }
}
