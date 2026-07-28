import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, ActivityItem, Alert, DonutChartData, TopRoute } from '../../services/dashboard.service';
import { StatCardComponent } from '../../shared/stat-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, StatCardComponent, LineChartComponent, DonutChartComponent, StatusBadgeComponent, PageHeaderComponent],
  templateUrl: 'dashboard.page.html',
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);
  readonly Loading = signal(true);

  constructor() {
    // Load all dashboard data on component initialization
    // thi
    this.dashboardService.loadAll();

    
  }

  // Expose dashboard service data to template
  readonly kpis = this.dashboardService.kpis;
  readonly activity = this.dashboardService.activity;
  readonly alerts = this.dashboardService.alerts;
  readonly revenueChartData = this.dashboardService.revenueChartData;
  readonly userDistribution = this.dashboardService.userDistribution;
  readonly paymentDistribution = this.dashboardService.paymentDistribution;
  readonly kycDistribution = this.dashboardService.kycDistribution;
  readonly topRoutes = this.dashboardService.topRoutes;

  // Computed properties to adapt service data to template expectations
  readonly data = computed(() => {
    const revenueData = this.dashboardService.revenueChartData();
    const reservationsData = this.dashboardService.reservationsChartData();
    
    return {
      kpis: this.mapKpisToTemplate(),
      revenueLabels: revenueData?.labels ?? [],
      revenueSeries: revenueData?.series[0] ?? [],
      newUsersSeries: revenueData?.series[1] ?? [],
      reservationsLabels: reservationsData?.labels ?? this.getReservationLabels(),
      reservationsSeries: reservationsData?.series ?? this.getReservationSeries(),
      userDistribution: this.mapToChartData(this.dashboardService.userDistribution()),
      paymentDistribution: this.mapToChartData(this.dashboardService.paymentDistribution()),
      kycDistribution: this.mapToChartData(this.dashboardService.kycDistribution()),
      topRoutes: this.dashboardService.topRoutes(),
      recentActivity: this.dashboardService.activity(),
      alerts: () => this.dashboardService.alerts(), // Fonction pour compatibilité template
    };
  });



  // Format currency
  fcfa(n: number): string {
    return this.dashboardService.fcfa(n);
  }

  // Format number
  formatNumber(n: number): string {
    return this.dashboardService.formatNumber(n);
  }

  // Alert link navigation
  alertLink(type: string): string {
    if (type === 'withdrawal' || type === 'refund') return '/finance/withdrawals';
    return '/moderation/agencies';
  }

  /**
   * Map service KPIs to template expectations
   */
  private mapKpisToTemplate() {
    const kpis = this.dashboardService.kpis();
    if (!kpis) {
      return {
        activeAgencies: 0,
        totalAgencies: 0,
        reservationsToday: 0,
        totalUsers: 0,
        newUsersThisWeek: 0,
        totalBalance: 0,
        platformRevenue: 0,
        pendingRefunds: 0,
        reservationsWeek: 0,
        fillRate: 0,
        cancellationRate: 0,
        totalAgents: 0,
        activeClientsToday: 0,
      };
    }

    return {
      activeAgencies: kpis.agencies.active,
      totalAgencies: kpis.agencies.total,
      reservationsToday: kpis.reservations.today,
      totalUsers: kpis.users.total,
      newUsersThisWeek: kpis.users.newThisWeek,
      totalBalance: kpis.finance.totalBalanceLocked,
      platformRevenue: kpis.finance.platformRevenue,
      pendingRefunds: kpis.finance.pendingRefunds,
      reservationsWeek: kpis.reservations.thisWeek,
      fillRate: kpis.reservations.fillRate,
      cancellationRate: kpis.reservations.cancellationRate,
      totalAgents: kpis.agents.total,
      activeClientsToday: kpis.agents.activeClientsToday,
    };
  }

  /**
   * Get reservation chart labels (last 7 days)
   */
  private getReservationLabels(): string[] {
    const labels = [];
    const date = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
    }
    return labels;
  }

  /**
   * Get reservation chart series (mock data for now, will be replaced by API)
   * TODO: Update backend to provide reservation trend data
   */
  private getReservationSeries(): number[] {
    // Generate mock reservation trend data
    const data = [];
    for (let i = 0; i < 7; i++) {
      data.push(Math.floor(Math.random() * 50) + 10);
    }
    return data;
  }

  /**
   * Map chart data to template format
   */
  private mapToChartData(data: DonutChartData[]): { label: string; value: number; color: string }[] {
    return data.map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color,
    }));
  }
}
