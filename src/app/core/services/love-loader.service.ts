// src/app/core/services/love-loader.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoveLoaderService {
  private _visible = new BehaviorSubject<boolean>(false);
  private _message = new BehaviorSubject<string>('Enviando recuerdos con todo mi amor...');

  visible$ = this._visible.asObservable();
  message$ = this._message.asObservable();

  show(message?: string) {
    if (message) {
      this._message.next(message);
    }
    this._visible.next(true);
  }

  hide() {
    this._visible.next(false);
    // Restaurar mensaje por defecto después de ocultar
    setTimeout(() => {
      this._message.next('Enviando recuerdos con todo mi amor...');
    }, 300);
  }
}
