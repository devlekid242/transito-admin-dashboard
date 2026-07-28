import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-agency-detail',
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  templateUrl: 'agency-detail.page.html',
})
export class AgencyDetailPage {
  readonly data = inject(MockDataService);
  private route = inject(ActivatedRoute);

  readonly agencyId = this.route.snapshot.paramMap.get('id') || '';

  readonly agency = computed(() => this.data.agencies().find(a => a.id === this.agencyId) || null);
  readonly trips = computed(() => this.data.agencyTrips().filter(t => t.agencyId === this.agencyId));
  readonly boardingPoints = computed(() => this.data.boardingPoints().filter(bp => bp.agencyId === this.agencyId));

  fcfa(n: number) { return this.data.fcfa(n); }
  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
}
