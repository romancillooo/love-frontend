import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import lettersData from '../../../../../public/assets/data/letters.json';

@Component({
  selector: 'app-letters-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-menu.html',
  styleUrls: ['./letter-menu.scss']
})
export class LettersMenu {
  letters = lettersData;

  constructor(private router: Router) {}

  openLetter(id: number) {
    this.router.navigate(['/letter', id]);
  }
}
