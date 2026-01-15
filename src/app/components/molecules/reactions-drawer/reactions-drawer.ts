import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Reaction } from '../../../core/models/letter';

@Component({
  selector: 'app-reactions-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drawer-overlay" [class.visible]="isOpen" (click)="close()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        
        <!-- Handle para indicar que es draggable/closable -->
        <div class="drawer-handle-area" (click)="close()">
          <div class="drawer-handle"></div>
        </div>

        <header class="drawer-header">
          <h3>Reacciones</h3>
          <span class="count">{{ reactions.length }} personas</span>
        </header>

        <div class="drawer-content">
          <ul class="reaction-list">
            <li *ngFor="let reaction of reactions" class="reaction-item">
              <!-- Avatar eliminado -->
              
              <div class="user-info">
                <span class="name">{{ reaction.user.displayName }}</span>
                <!-- Username eliminado -->
              </div>
              
              <div class="reaction-emoji">
                {{ reaction.emoji }}
              </div>
            </li>
          </ul>
          
          <div *ngIf="reactions.length === 0" class="empty-state">
            <p>Aún no hay reacciones. ¡Sé el primero!</p>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ... (estilos de overlay y panel igual) ... */
    .drawer-overlay {
      /* 💜 BACKDROP - Exactamente igual que letter-creator */
      position: fixed;
      inset: 0;
      z-index: 1900;
      background: rgba(139, 92, 246, 0.22); /* 💜 Lila overlay */
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;

      &.visible {
        opacity: 1;
        pointer-events: auto;
        
        .drawer-panel {
          transform: translateY(0);
        }
      }
    }

    .drawer-panel {
      /* 💜 PANEL - Exactamente igual que letter-creator-modal */
      background: rgba(167, 139, 250, 0.18); /* 💜 Lila glassmorphism */
      backdrop-filter: blur(18px) saturate(185%);
      -webkit-backdrop-filter: blur(18px) saturate(185%);
      border-radius: 24px 24px 0 0;
      border: 1px solid rgba(255, 255, 255, 0.28);
      box-shadow: 0 -10px 48px rgba(0, 0, 0, 0.35);
      width: 100%;
      max-height: 70vh;
      transform: translateY(100%);
      transition: transform 0.28s ease-out;
      padding-bottom: env(safe-area-inset-bottom, 20px);
      display: flex;
      flex-direction: column;
      color: #fff;
      animation: zoom-in 0.28s ease-out;
    }

    .drawer-handle-area {
      padding: 16px 0 12px;
      display: flex;
      justify-content: center;
      cursor: pointer;
    }

    .drawer-handle {
      width: 48px;
      height: 5px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 99px;
    }

    .drawer-header {
      padding: 0 24px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.1);
        font-family: var(--ff-display, sans-serif);
      }

      .count {
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }
    }

    .drawer-content {
      padding: 0 16px;
      overflow-y: auto;
    }

    .reaction-list {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }

    .reaction-item {
      display: flex;
      align-items: center;
      justify-content: space-between; /* Asegura separación */
      padding: 16px 20px;
      border-radius: 16px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start; /* Alineación a la izquierda explícita */
      text-align: left; /* Texto a la izquierda */

      .name {
        font-weight: 600;
        color: #fff;
        font-size: 1.05rem;
        letter-spacing: 0.01em;
      }
    }

    .reaction-emoji {
      font-size: 1.8rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }


    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.05rem;
    }

    @keyframes popIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes zoom-in {
      from {
        opacity: 0;
        transform: translateY(100%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ReactionsDrawerComponent implements OnChanges {
  @Input() reactions: Reaction[] = [];
  @Input() isOpen = false;
  @Output() closeDrawer = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  // Asegurar limpiar el estilo al destruir
  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  close() {
    this.closeDrawer.emit();
  }
}
