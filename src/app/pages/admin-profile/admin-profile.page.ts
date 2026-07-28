import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-admin-profile',
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: 'admin-profile.page.html',
})
export class AdminProfilePage {
  readonly data = inject(MockDataService);
  readonly saved = signal(false);

  myActions() { return this.data.auditLogs().filter(l => l.admin === 'Super Admin').slice(0, 5); }
  str(n: number) { return String(n); }

  saveProfile() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
