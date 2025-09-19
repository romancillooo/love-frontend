import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import lettersData from '../../../../public/assets/data/letters.json';
@Component({
  selector: 'app-letter-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-detail.html',
  styleUrls: ['./letter-detail.scss']
})
export class LetterDetail {
  letter: any;
  displayText: string = '';
  private index = 0;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.letter = (lettersData as any[]).find(l => l.id === id);

    if (this.letter) {
      this.typeWriter();
    }
  }

  private typeWriter() {
    if (this.index < this.letter.content.length) {
      this.displayText += this.letter.content.charAt(this.index);
      this.index++;
      this.cdr.detectChanges(); // 👈 Forzamos Angular a refrescar
      setTimeout(() => this.typeWriter(), 40);
    }
  }
}
