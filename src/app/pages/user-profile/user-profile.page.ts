import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterLink, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'user-profile.page.html',
})
export class UserProfilePage {
  readonly data = inject(MockDataService);
  private route = inject(ActivatedRoute);
  readonly userId = this.route.snapshot.paramMap.get('id') || '';

  readonly profile = computed(() => this.data.getUserProfile(this.userId));

  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }
  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  typeLabel(type: string): string {
    const map: Record<string, string> = { PAYMENT: 'Paiement', WITHDRAWAL: 'Retrait', REFUND: 'Remboursement', COMMISSION: 'Commission', TOPUP: 'Recharge' };
    return map[type] || type;
  }

  toggleBlock() {
    this.data.users.update(list => list.map(u => u.id === this.userId ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' as const : 'ACTIVE' as const } : u));
  }
}
