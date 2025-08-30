import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginPage {
  password = '';
  errorMessage = '';
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    if (this.auth.login(this.password)) {
      this.router.navigate(['/home']);
    } else {
      this.errorMessage = '❌ Clave incorrecta, intentalé otra vez mi amor ❤️';
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
