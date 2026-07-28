import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-agency-stats',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, LineChartComponent, BarChartComponent],
  templateUrl: 'agency-stats.page.html',
})
export class AgencyStatsPage {
  readonly data = inject(MockDataService);
  private route = inject(ActivatedRoute);

  readonly agencyId = this.route.snapshot.paramMap.get('id') || '';

  readonly agency = computed(() => this.data.agencies().find(a => a.id === this.agencyId) || null);
  readonly stats = computed(() => this.data.getAgencyStats(this.agencyId));
  readonly trips = computed(() => this.data.agencyTrips().filter(t => t.agencyId === this.agencyId));

  readonly tripsRevenue = computed(() => {
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#0891b2', '#dc2626'];
    return this.trips().map((t, i) => ({
      label: t.route.split(' → ')[0] === 'Dakar' ? t.route.split(' → ')[1]?.slice(0, 6) || t.route.slice(0, 8) : t.route.slice(0, 8),
      value: t.price * t.seats,
      color: colors[i % colors.length],
    }));
  });

  str(n: number) { return String(n); }
  fcfa(n: number) { return this.data.fcfa(n); }
}
