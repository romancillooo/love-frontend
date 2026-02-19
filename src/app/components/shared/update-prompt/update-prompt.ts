// src/app/components/shared/update-prompt/update-prompt.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  templateUrl: './update-prompt.html',
  styleUrls: ['./update-prompt.scss'],
})
export class UpdatePromptComponent {
  @Input() visible = false;

  @Output() accepted = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  update() {
    this.accepted.emit();
  }

  dismiss() {
    this.dismissed.emit();
  }
}
