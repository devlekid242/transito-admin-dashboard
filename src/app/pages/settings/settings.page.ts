import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemSettingsService } from '../../services/system-settings.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: 'settings.page.html',
})
export class SettingsPage {
  readonly settingsService = inject(SystemSettingsService);
  readonly platformFee = signal(500);

  constructor() {
    this.settingsService.getSettings().subscribe((response) => {
      if (response.success && response.data) this.platformFee.set(response.data.platformFee);
    });
  }
  readonly feeSaved = signal(false);

  fcfa(n: number) {
    return `${n.toLocaleString('fr-FR')} FCFA`;
  }

  initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  updateFee(value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0) {
      this.settingsService.saveSettings({ platformFee: n }).subscribe((response) => {
        if (response.success) {
          this.platformFee.set(n);
          this.feeSaved.set(true);
          setTimeout(() => this.feeSaved.set(false), 3000);
        }
      });
    }
  }
}
