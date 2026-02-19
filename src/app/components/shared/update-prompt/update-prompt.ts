// src/app/components/shared/update-prompt/update-prompt.ts
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  templateUrl: './update-prompt.html',
  styleUrls: ['./update-prompt.scss'],
})
export class UpdatePromptComponent implements OnChanges, OnDestroy {
  @Input() visible = false;

  @Output() accepted = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        // 🔒 Bloquear scroll cuando el modal se muestra
        document.body.style.overflow = 'hidden';
      } else {
        // 🔓 Restaurar scroll cuando el modal se oculta
        document.body.style.overflow = '';
      }
    }
  }

  ngOnDestroy() {
    // 🔓 Restaurar scroll si el componente se destruye mientras está visible
    if (this.visible) {
      document.body.style.overflow = '';
    }
  }

  update() {
    this.accepted.emit();
  }

  dismiss() {
    this.dismissed.emit();
  }
}
