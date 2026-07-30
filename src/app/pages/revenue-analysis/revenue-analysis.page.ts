import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialService, PeriodType } from '../../services/financial.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-revenue-analysis',
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, LineChartComponent, BarChartComponent, DonutChartComponent],
  templateUrl: 'revenue-analysis.page.html',
})
export class RevenueAnalysisPage {
  readonly financialService = inject(FinancialService);
  
  readonly periods = [
    { value: 'daily' as const, label: 'Jour' },
    { value: 'weekly' as const, label: 'Semaine' },
    { value: 'monthly' as const, label: 'Mois' },
  ];

  // Use the service's date filter state directly
  readonly dateFilter = this.financialService.dateFilter;

  constructor() {
    // Load initial data
    this.loadData();

    // Reload data when filter changes
    effect(() => {
      this.dateFilter(); // Just trigger on filter change
      this.loadData();
    });
  }

  // Computed properties
  readonly data = computed(() => this.financialService.revenueAnalysis());
  readonly loading = computed(() => this.financialService.loadingRevenueAnalysis());
  readonly error = computed(() => this.financialService.errorRevenueAnalysis());

  fcfa(n: number) { return this.financialService.fcfa(n); }
  str(n: number) { return String(n); }
  formatPercentage(n: number) { return this.financialService.formatPercentage(n); }
  
  // KPI computations
  platformRevenue() {
    const data = this.data();
    return data?.kpis?.platformRevenue ?? 0;
  }

  platformNetEarnings() {
    const data = this.data();
    return data?.kpis?.netEarnings ?? 0;
  }

  platformCommissions() {
    const data = this.data();
    return data?.kpis?.platformFees?.platformFees ?? 0;
  }

  revenueGrowthRate() {
    const data = this.data();
    return data?.kpis?.revenueGrowthRate ?? 0;
  }

  // Chart data
  readonly chartSeries = computed(() => {
    const data = this.data();
    if (!data) return [];
    
    return [
      { name: 'CA', data: data.chartData.caSeries, color: '#2563eb', dotClass: 'bg-green-600' },
      { name: 'Bénéfice', data: data.chartData.beneficeSeries, color: '#16a34a', dotClass: 'bg-green-600' },
      { name: 'Commissions', data: data.chartData.commissionsSeries, color: '#9333ea', dotClass: 'bg-violet-600' },
    ];
  });

  readonly chartLabels = computed(() => this.data()?.chartData.labels ?? []);

  readonly agencyBarData = computed(() => {
    const data = this.data();
    if (!data) return [];
    
    return data.revenueByAgency.map(a => ({
      label: a.agency.split(' ')[0],
      value: a.revenue,
      color: a.color,
    }));
  });

  readonly revenueByRoute = computed(() => this.data()?.revenueByRoute ?? []);

  readonly paymentDistribution = computed(() => this.data()?.paymentDistribution ?? []);

  readonly refundsTrendSeries = computed(() => {
    const data = this.data();
    if (!data) return [];
    
    return [{
      name: 'Remboursements',
      data: data.refundsTrend.series,
      color: '#dc2626',
      fill: '#dc2626',
      dotClass: 'bg-red-500'
    }];
  });

  readonly refundsTrendLabels = computed(() => this.data()?.refundsTrend.labels ?? []);

  // Load data
  loadData() {
    this.financialService.loadRevenueAnalysis(this.dateFilter());
  }

  // Period change handler
  onPeriodChange(period: PeriodType) {
    this.financialService.updatePeriod(period);
  }

  // Custom date range handlers
  onStartDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.financialService.updateDateFilter({
      ...this.dateFilter(),
      startDate: input.value
    });
  }

  onEndDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.financialService.updateDateFilter({
      ...this.dateFilter(),
      endDate: input.value
    });
  }

  applyCustomDateRange() {
    const filter = this.dateFilter();
    if (filter.startDate && filter.endDate) {
      this.loadData();
    }
  }

  // Refresh data
  refresh() {
    this.loadData();
  }

  // Helper methods for trend display
  getRevenueTrend(): string {
    const rate = this.revenueGrowthRate();
    if (rate > 0) return `+${this.formatPercentage(rate)}`;
    if (rate < 0) return `${this.formatPercentage(rate)}`;
    return 'Stable';
  }

  getNetEarningsTrend(): string {
    // For now, use same growth rate as revenue
    const rate = this.revenueGrowthRate() * 0.8; // Assume slightly lower growth for net earnings
    if (rate > 0) return `+${this.formatPercentage(rate)}`;
    if (rate < 0) return `${this.formatPercentage(rate)}`;
    return 'Stable';
  }

  getCommissionsTrend(): string {
    // For now, use same growth rate as revenue
    const rate = this.revenueGrowthRate();
    if (rate > 0) return `+${this.formatPercentage(rate)}`;
    if (rate < 0) return `${this.formatPercentage(rate)}`;
    return 'Stable';
  }
}
