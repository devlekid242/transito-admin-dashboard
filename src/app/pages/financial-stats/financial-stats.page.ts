import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-financial-stats',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, LineChartComponent, BarChartComponent],
  templateUrl: 'financial-stats.page.html',
})
export class FinancialStatsPage {
  readonly data = inject(MockDataService);
  readonly activePeriod = signal<'week' | 'month' | 'year'>('month');

  readonly periods = [
    { value: 'week' as const, label: 'Semaine' },
    { value: 'month' as const, label: 'Mois' },
    { value: 'year' as const, label: 'Année' },
  ];

  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }
  round(n: number) { return Math.round(n); }

  agencyBarData() {
    return this.data.revenueByAgency.map(a => ({
      label: a.agency.split(' ')[0],
      value: a.revenue,
      color: a.color,
    }));
  }
}
