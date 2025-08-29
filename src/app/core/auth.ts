import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isLoggedIn = false;
  private readonly secretPassword = 'lovesito190725';

  login(pass: string): boolean {
    if (pass === this.secretPassword) {
      this.isLoggedIn = true;
      return true;
    }
    return false;
  }

  logout() {
    this.isLoggedIn = false;
  }

  get authenticated() {
    return this.isLoggedIn;
  }
}
