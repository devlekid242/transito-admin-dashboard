import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AdminAuthService } from './services/admin-auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: 'app.component.html',
})
export class AppComponent {
  private router = inject(Router);
  private adminAuthService = inject(AdminAuthService);
  readonly checking = signal(true);

  constructor() {
    setTimeout(() => {
      if (!this.adminAuthService.isAuthenticated()) {
        const currentUrl = this.router.url;
        if (!currentUrl.startsWith('/login')) {
          this.router.navigate(['/login']);
        }
      }
      this.checking.set(false);
    }, 300);
  }
}
