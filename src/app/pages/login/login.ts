import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { finalize, take } from 'rxjs/operators';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginPage {
  identifier = '';
  password = '';
  errorMessage = '';
  showPassword = false;
  isSubmitting = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onLogin() {
    const identifier = this.identifier.trim();
    const password = this.password.trim();

    if (!identifier) {
      this.errorMessage = 'Necesito tu correo o tu usuario, mi amor ❤️';
      return;
    }

    if (!password) {
      this.errorMessage = 'Por favor ingresa la clave amor ❤️';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.auth
      .login(identifier, password)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/home']),
        error: (error) => {
          this.errorMessage = this.resolveError(error);
        },
      });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = (error.error && error.error.message) || error.message;
      if (backendMessage) {
        return backendMessage;
      }
    }
    return '❌ Clave incorrecta, inténtalo otra vez mi amor ❤️';
  }
}
