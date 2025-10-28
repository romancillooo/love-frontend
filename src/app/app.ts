// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/organisms/navbar/navbar';
import { LoveLoaderComponent } from './components/shared/love-loader/love-loader';
import { LoveLoaderService } from './core/services/love-loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, LoveLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('love-project');

  // 🩷 Loader global controlado por signal
  isLoading = signal(false);
  loaderMessage = signal('Enviando recuerdos con todo mi amor...');

  constructor(private readonly loaderService: LoveLoaderService) {
    // Suscribirse al servicio de loader
    this.loaderService.visible$.subscribe((visible) => {
      this.isLoading.set(visible);
    });

    this.loaderService.message$.subscribe((message) => {
      this.loaderMessage.set(message);
    });
  }
}
