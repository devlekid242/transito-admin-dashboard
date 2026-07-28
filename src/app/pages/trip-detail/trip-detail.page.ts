import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-trip-detail',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'trip-detail.page.html',
})
export class TripDetailPage {
  readonly data = inject(MockDataService);
  private route = inject(ActivatedRoute);

  readonly tripId = this.route.snapshot.paramMap.get('id') || '';
  readonly trip = computed(() => this.data.trips().find(t => t.id === this.tripId) || null);

  fcfa(n: number) { return this.data.fcfa(n); }

  get boardedCount() {
    return this.trip()?.manifest.filter(p => p.status === 'BOARDED').length || 0;
  }
  get noShowCount() {
    return this.trip()?.manifest.filter(p => p.status === 'NO_SHOW').length || 0;
  }
  get boardingCount() {
    return this.trip()?.manifest.filter(p => p.status === 'BOARDING').length || 0;
  }
}
