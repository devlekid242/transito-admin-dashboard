import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, Agency, KycStatus, AccountStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-agencies',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatusBadgeComponent],
  templateUrl: 'agencies.page.html',
})
export class AgenciesPage {
  readonly data = inject(MockDataService);

  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  kycCount(status: KycStatus) { return this.data.agencies().filter(a => a.kyc === status).length; }
  suspendedCount() { return this.data.agencies().filter(a => a.account === 'SUSPENDED').length; }

  toggleAccount(a: Agency) {
    this.data.agencies.update(list => list.map(x => x.id === a.id ? { ...x, account: (x.account === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE') as AccountStatus } : x));
  }
}
