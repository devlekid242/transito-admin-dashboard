import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, AdminUser, AdminRole } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-admins',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent],
  templateUrl: 'admins.page.html',
})
export class AdminsPage {
  readonly data = inject(MockDataService);

  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  str(n: number) { return String(n); }
  roleCount(role: AdminRole) { return this.data.admins().filter(a => a.role === role).length; }

  roleLabel(role: AdminRole): string {
    const map: Record<AdminRole, string> = { SUPER_ADMIN: 'Super Admin', FINANCE: 'Finance', MODERATION: 'Modération', SUPPORT: 'Support' };
    return map[role];
  }

  removeAdmin(a: AdminUser) {
    this.data.admins.update(list => list.filter(x => x.id !== a.id));
  }
}
