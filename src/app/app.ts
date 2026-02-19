// src/app/app.ts
import { Component, isDevMode, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { EmojiSelectorModalComponent } from './components/organisms/emoji-selector-modal/emoji-selector-modal';
import { NavbarComponent } from './components/organisms/navbar/navbar';
import { LoveLoaderComponent } from './components/shared/love-loader/love-loader';
import { UpdatePromptComponent } from './components/shared/update-prompt/update-prompt';
import { LoveLoaderService } from './core/services/love-loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, LoveLoaderComponent, EmojiSelectorModalComponent, UpdatePromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('love-project');

  // 🩷 Loader global controlado por signal
  isLoading = signal(false);
  loaderMessage = signal('Enviando recuerdos con todo mi amor...');

  // 🔄 PWA Update
  showUpdatePrompt = signal(false);

  constructor(
    private readonly loaderService: LoveLoaderService,
    private readonly swUpdate: SwUpdate,
  ) {
    // Suscribirse al servicio de loader
    this.loaderService.visible$.subscribe((visible) => {
      this.isLoading.set(visible);
    });

    this.loaderService.message$.subscribe((message) => {
      this.loaderMessage.set(message);
    });

    // 🔄 PWA: Detectar nuevas versiones disponibles
    this.initUpdateListener();
  }

  private initUpdateListener() {
    if (!this.swUpdate.isEnabled) return;

    // Escuchar cuando hay una versión lista para activar
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        console.log('🔄 Nueva versión disponible');
        this.showUpdatePrompt.set(true);
      });

    // Comprobar actualizaciones cada 5 minutos
    if (!isDevMode()) {
      setInterval(() => {
        this.swUpdate.checkForUpdate().then((hasUpdate) => {
          if (hasUpdate) {
            console.log('🔄 Actualización encontrada en check periódico');
          }
        });
      }, 5 * 60 * 1000);
    }
  }

  onAcceptUpdate() {
    // Recargar la página para activar la nueva versión
    document.location.reload();
  }

  onDismissUpdate() {
    this.showUpdatePrompt.set(false);
  }
}
