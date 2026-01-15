import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Reaction } from '../../../core/models/letter';

@Component({
  selector: 'app-reaction-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="reaction-badge" 
      (click)="onClick($event)" 
      [class.has-reaction]="reactions.length > 0"
      [class.variant-user]="variant === 'user'"
      role="button"
      tabindex="0"
    >
      <!-- Caso 1: Sin reacciones -->
      <span *ngIf="reactions.length === 0" class="placeholder-emoji">
        ☺
      </span>

      <!-- Caso 2: Con reacciones -->
      <ng-container *ngIf="reactions.length > 0">
        <ng-container *ngIf="isSameEmoji; else multiEmoji">
          <span class="emoji">{{ reactions[0].emoji }}</span>
          <span class="count">{{ reactions.length }}</span>
        </ng-container>

        <ng-template #multiEmoji>
          <div class="emoji-stack">
            <span *ngFor="let r of reactions" class="emoji">
              {{ r.emoji }}
            </span>
          </div>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [`
    .reaction-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 20px;
      backdrop-filter: blur(4px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      user-select: none;

      &:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.8);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &:active {
        transform: scale(0.95);
      }

      &.has-reaction {
        background: rgba(255, 255, 255, 0.7);
        border-color: rgba(139, 92, 246, 0.3); /* Violeta suave */
      }
      &.variant-user {
        background: rgba(255, 255, 255, 0.45);
        border-color: rgba(255, 182, 255, 0.4);
        
        &:hover {
          background: rgba(255, 255, 255, 0.65);
          border-color: rgba(255, 182, 255, 0.6);
        }

        .count {
          color: #a855f7;
        }
      }
    }

    .placeholder-emoji {
      opacity: 0.5;
      font-size: 1.1rem;
      color: #666;
    }

    .emoji {
      font-size: 1.1rem;
      line-height: 1;
    }

    .count {
      font-size: 0.85rem;
      font-weight: 600;
      color: #5b21b6; /* Violeta oscuro por defecto */
    }

    .emoji-stack {
      display: flex;
      gap: 2px;
    }
  `]
})
export class ReactionBadgeComponent {
  @Input() reactions: Reaction[] = [];
  @Input() variant: 'default' | 'user' = 'default'; // 🔹 Nueva variante
  @Output() badgeClick = new EventEmitter<void>();

  get isSameEmoji(): boolean {
    if (this.reactions.length < 2) return true;
    const first = this.reactions[0].emoji;
    return this.reactions.every(r => r.emoji === first);
  }

  onClick(event: Event) {
    event.stopPropagation();
    this.badgeClick.emit();
  }
}
