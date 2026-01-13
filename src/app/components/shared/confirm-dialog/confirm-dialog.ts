// src/app/components/shared/confirm-dialog/confirm-dialog.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.scss'],
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() title = '¿Estás seguro? 💭';
  @Input() message = '¿Deseas continuar con esta acción?';
  @Input() confirmText = 'Sí, eliminar 💔';
  @Input() cancelText = 'Cancelar';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnInit() {
    // Bloquear scroll al abrir
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    // Restaurar scroll al cerrar
    document.body.style.overflow = '';
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
