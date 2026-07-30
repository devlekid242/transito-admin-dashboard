import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgencyService, AgencyStats } from '../../services/agency.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-agency-stats',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, BarChartComponent],
  templateUrl: 'agency-stats.page.html',
})
export class AgencyStatsPage implements OnInit {
  private readonly agencyService = inject(AgencyService);
  private readonly route = inject(ActivatedRoute);

  readonly agencyId = signal<number | null>(null);
  readonly agency = this.agencyService.currentAgency;
  readonly stats = this.agencyService.agencyStats;
  readonly trips = this.agencyService.agencyTrips;
  readonly loading = this.agencyService.loadingStats;
  readonly loadingTrips = this.agencyService.loadingTrips;

  // Chart data
  readonly tripsRevenue = computed(() => {
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#0891b2', '#dc2626'];
    const statsData = this.stats();
    if (!statsData) return [];
    return statsData.topRoutes.map((t, i) => ({
      label: t.route.length > 10 ? t.route.slice(0, 10) + '...' : t.route,
      value: t.totalRevenue,
      fillRate: t.fillRate,
      reservationsCount: t.reservationsCount,
      color: colors[i % colors.length],
    }));
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.agencyId.set(Number(id));
    }
  }

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    const id = this.agencyId();
    if (id) {
      this.agencyService.getAgency(id).subscribe();
      this.agencyService.getAgencyStats(id).subscribe();
      this.agencyService.getAgencyTrips(id).subscribe();
    }
  }

  str(n: number): string { return String(n); }
  fcfa(n: number): string { return this.agencyService.formatCurrency(n); }
  formatDateTime(dateString: string): string { return this.agencyService.formatDateTime(dateString); }

  // Get stats values
  getGeneralStats() {
    const statsData = this.stats();
    return statsData ? statsData.general : null;
  }

  getFinanceStats() {
    const statsData = this.stats();
    return statsData ? statsData.finance : null;
  }

  // Format percentage
  formatPercent(n: number): string {
    return n.toFixed(2) + '%';
  }

  // Format rating
  formatRating(n: number): string {
    return n.toFixed(1) + '/5';
  }
}
