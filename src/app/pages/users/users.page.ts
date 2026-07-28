import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, User, AccountStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-users',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, StatCardComponent],
  templateUrl: 'users.page.html',
})
export class UsersPage {
  readonly data = inject(MockDataService);
  readonly search = signal('');
  readonly role = signal<'ALL' | 'CLIENT' | 'AGENT'>('ALL');

  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  formatNumber(n: number) { return String(n); }
  str(n: number) { return String(n); }

  filteredUsers() {
    const s = this.search().toLowerCase().trim();
    const r = this.role();
    return this.data.users().filter(u => {
      const matchRole = r === 'ALL' || u.role === r;
      const matchSearch = !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.phone.includes(s);
      return matchRole && matchSearch;
    });
  }

  onRoleChange(value: string) { this.role.set(value as 'ALL' | 'CLIENT' | 'AGENT'); }

  toggleBlock(u: User) {
    this.data.users.update(list => list.map(x => x.id === u.id ? { ...x, status: (x.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE') as AccountStatus } : x));
  }
}
