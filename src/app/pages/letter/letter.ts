import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-letter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter.html',
  styleUrls: ['./letter.scss']
})
export class LetterPage {
  fullText: string = `
    Mi amor 💖,

    No hay palabras suficientes para describir lo mucho que significas para mí.
    Cada foto que ves aquí, cada recuerdo, es solo un reflejo de lo afortunado que soy de tenerte en mi vida.

    Gracias por tu risa, por tu apoyo, y por ser mi lugar seguro.
    Eres lo más bonito que me ha pasado, y cada día a tu lado es un regalo que nunca dejaré de agradecer.

    Te amo con todo mi corazón ❤️
  `;

  displayText: string = '';
  private index = 0;

  ngOnInit() {
    this.typeWriter();
  }

  private typeWriter() {
    if (this.index < this.fullText.length) {
      this.displayText += this.fullText.charAt(this.index);
      this.index++;
      setTimeout(() => this.typeWriter(), 40); // velocidad de tipeo
    }
  }
}
