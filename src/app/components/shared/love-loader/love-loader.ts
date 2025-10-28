// src/app/components/shared/love-loader/love-loader.ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-love-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './love-loader.html',
  styleUrls: ['./love-loader.scss'],
})
export class LoveLoaderComponent {
  @Input() visible = false;
  @Input() message: string = 'Enviando recuerdos con todo mi amor...';
  @Input() gifSrc: string = '/assets/love-loader.gif';
}
