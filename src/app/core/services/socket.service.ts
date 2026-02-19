// src/app/core/services/socket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { resolveBaseUrl } from '../api.config';
import { Observable, Subject } from 'rxjs';
import { LetterComment, Reaction } from '../models/letter';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | undefined;

  constructor() {}

  // Inicializar conexión
  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    const url = resolveBaseUrl();
    console.log('🔌 Conectando Socket.io a:', url);
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'], // Polling como fallback necesario para GAE
      withCredentials: true,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Error de conexión Socket:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket desconectado:', reason);
    });
  }

  joinLetterRoom(letterId: string) {
    if (!this.socket) this.connect();
    this.socket?.emit('join:letter', letterId);
  }

  leaveLetterRoom(letterId: string) {
    this.socket?.emit('leave:letter', letterId);
  }

  // Escuchar eventos
  onNewComment(): Observable<{ letterId: string, comment: LetterComment }> {
    return new Observable(observer => {
      this.socket?.on('server:new_comment', (data) => observer.next(data));
      return () => this.socket?.off('server:new_comment');
    });
  }

  onReactionUpdate(): Observable<{ letterId: string, reactions: Reaction[] }> {
    return new Observable(observer => {
      this.socket?.on('server:reaction_update', (data) => observer.next(data));
      return () => this.socket?.off('server:reaction_update');
    });
  }

  // --- Typing Indicators ---
  emitTyping(letterId: string) {
    this.socket?.emit('client:typing', { letterId });
  }

  emitStopTyping(letterId: string) {
    this.socket?.emit('client:stop_typing', { letterId });
  }

  onUserTyping(): Observable<{ letterId: string, user: { displayName: string, username: string } }> {
    return new Observable(observer => {
      this.socket?.on('server:user_typing', (data) => observer.next(data));
      return () => this.socket?.off('server:user_typing');
    });
  }

  onUserStopTyping(): Observable<{ letterId: string, user: { username: string } }> {
    return new Observable(observer => {
      this.socket?.on('server:user_stop_typing', (data) => observer.next(data));
      return () => this.socket?.off('server:user_stop_typing');
    });
  }

  ngOnDestroy() {
    this.disconnect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
