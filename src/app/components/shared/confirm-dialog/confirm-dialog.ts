// src/app/components/shared/confirm-dialog/confirm-dialog.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.scss'],
})
export class ConfirmDialogComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() title = '¿Estás seguro? 💭';
  @Input() message = '¿Deseas continuar con esta acción?';
  @Input() confirmText = 'Sí, eliminar 💔';
  @Input() cancelText = 'Cancelar';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        // 🔒 Bloquear scroll solo cuando el diálogo se muestra
        document.body.style.overflow = 'hidden';
      } else {
        // 🔓 Restaurar scroll cuando el diálogo se oculta
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

  onConfirm() {
    console.log('✅ ConfirmDialog: onConfirm() llamado, emitiendo evento');
    this.confirm.emit();
  }

  onCancel() {
    console.log('❌ ConfirmDialog: onCancel() llamado, emitiendo evento');
    this.cancel.emit();
  }
}
