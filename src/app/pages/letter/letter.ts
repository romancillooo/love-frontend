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
    Hola preciosa,

    No hay palabras suficientes para describir lo mucho que significas para mí.
    Cada foto que ves aquí, cada recuerdo, es solo un reflejo de lo feliz que soy de tenerte en mi vida.

    Gracias por tanto amor, por tanto cariño, por siempre apoyarme, eres lo mejor que tengo preciosa 🥰.
    k afortunado k soi deveraz 👉👈.

    Te amo mucho mi amor hermosa, amor de mi vida ❤️

    -tu bebito
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
