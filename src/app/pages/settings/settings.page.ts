import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: 'settings.page.html',
})
export class SettingsPage {
  readonly data = inject(MockDataService);
  readonly platformFee = signal(350);
  readonly feeSaved = signal(false);

  fcfa(n: number) {
    return this.data.fcfa(n);
  }

  initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  updateFee(value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0) {
      this.platformFee.set(n);
      this.feeSaved.set(true);
      setTimeout(() => this.feeSaved.set(false), 3000);
    }
  }
}
