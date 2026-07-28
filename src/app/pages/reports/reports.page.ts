import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, LineChartComponent, BarChartComponent, DonutChartComponent],
  templateUrl: 'reports.page.html',
})
export class ReportsPage {
  readonly data = inject(MockDataService);
  readonly exported = signal(false);

  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }

  agencyBarData() {
    return this.data.revenueByAgency.map(a => ({ label: a.agency.split(' ')[0], value: a.revenue, color: a.color }));
  }

  weeklyData() {
    return this.data.reservationsLabels.map((label, i) => ({
      label,
      value: this.data.reservationsSeries[i],
      color: '#2563eb',
    }));
  }

  exportCsv() {
    this.exported.set(true);
    setTimeout(() => this.exported.set(false), 2500);
  }
}
