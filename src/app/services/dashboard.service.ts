import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of, tap } from 'rxjs';

// Interfaces for Dashboard KPIs
export interface DashboardKpis {
  agencies: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    newThisWeek: number;
  };
  finance: {
    totalBalanceLocked: number;
    totalBalanceAvailable: number;
    platformRevenue: number;
    pendingRefunds: number;
  };
  reservations: {
    today: number;
    thisWeek: number;
    fillRate: number;
    cancellationRate: number;
  };
  withdrawals: {
    pendingCount: number;
    pendingAmount: number;
  };
  agents: {
    total: number;
    activeClientsToday: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'withdrawal' | 'reservation' | 'support';
  text: string;
  detail: string;
  time: string;
  date: string;
  severity: 'warning' | 'info' | 'danger';
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface Alert {
  id: string;
  type: 'withdrawal' | 'refund' | 'agency';
  label: string;
  description: string;
  amount: number | null;
  count: number;
  severity: 'danger' | 'warning';
}

export interface ChartData {
  labels: string[];
  series: number[][];
}

export interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

export interface TopRoute {
  route: string;
  bookings: number;
  revenue: number;
  fillRate: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Signals for reactive state management
  readonly kpis = signal<DashboardKpis | null>(null);
  readonly activity = signal<ActivityItem[]>([]);
  readonly alerts = signal<Alert[]>([]);
  readonly revenueChartData = signal<ChartData | null>(null);
  readonly userDistribution = signal<DonutChartData[]>([]);
  readonly paymentDistribution = signal<DonutChartData[]>([]);
  readonly kycDistribution = signal<DonutChartData[]>([]);
  readonly topRoutes = signal<TopRoute[]>([]);
  readonly reservationsChartData = signal<{ labels: string[]; series: number[] } | null>(null);
  readonly newUsersChartData = signal<{ labels: string[]; series: number[] } | null>(null);

  // Loading states
  readonly loadingKpis = signal<boolean>(false);
  readonly loadingActivity = signal<boolean>(false);
  readonly loadingAlerts = signal<boolean>(false);
  readonly loadingCharts = signal<boolean>(false);

  // Error states
  readonly error = signal<string | null>(null);

  /**
   * Load all dashboard KPIs
   */
  loadKpis() {
    this.loadingKpis.set(true);
    this.error.set(null);

    this.http
      .get<{ success: boolean; data: DashboardKpis }>(`${this.apiBaseUrl}/admin/dashboard/kpis`)
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement des indicateurs.');
          this.loadingKpis.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.kpis.set(response.data);
          }
          this.loadingKpis.set(false);
        },
        error: () => {
          this.loadingKpis.set(false);
        },
      });
  }

  /**
   * Load recent activity
   */
  loadActivity() {
    this.loadingActivity.set(true);

    this.http
      .get<{ success: boolean; data: ActivityItem[] }>(`${this.apiBaseUrl}/admin/dashboard/activity`)
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement de l\'activité récente.');
          this.loadingActivity.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.activity.set(response.data);
          }
          this.loadingActivity.set(false);
        },
        error: () => {
          this.loadingActivity.set(false);
        },
      });
  }

  /**
   * Load alerts
   */
  loadAlerts() {
    this.loadingAlerts.set(true);

    this.http
      .get<{ success: boolean; data: Alert[] }>(`${this.apiBaseUrl}/admin/dashboard/alerts`)
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement des alertes.');
          this.loadingAlerts.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.alerts.set(response.data);
          }
          this.loadingAlerts.set(false);
        },
        error: () => {
          this.loadingAlerts.set(false);
        },
      });
  }

  /**
   * Load all chart data
   */
  loadCharts() {
    this.loadingCharts.set(true);

    // Load revenue chart (includes both revenue and new users series)
    this.http
      .get<{ success: boolean; data: { labels: string[]; revenueSeries: number[]; newUsersSeries: number[] } }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/revenue`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.revenueChartData.set({
              labels: response.data.labels,
              series: [response.data.revenueSeries, response.data.newUsersSeries],
            });
          }
        },
      });

    // Load reservations trend chart
    this.http
      .get<{ success: boolean; data: { labels: string[]; series: number[] } }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/reservations`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.reservationsChartData.set(response.data);
          }
        },
      });

    // Load new users trend chart
    this.http
      .get<{ success: boolean; data: { labels: string[]; series: number[] } }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/new-users`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.newUsersChartData.set(response.data);
          }
        },
      });

    // Load user distribution
    this.http
      .get<{ success: boolean; data: DonutChartData[] }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/users`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.userDistribution.set(response.data);
          }
        },
      });

    // Load payment distribution
    this.http
      .get<{ success: boolean; data: DonutChartData[] }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/payments`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.paymentDistribution.set(response.data);
          }
        },
      });

    // Load KYC distribution
    this.http
      .get<{ success: boolean; data: DonutChartData[] }>(
        `${this.apiBaseUrl}/admin/dashboard/charts/kyc`,
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.kycDistribution.set(response.data);
          }
        },
      });

    // Load top routes
    this.http
      .get<{ success: boolean; data: TopRoute[] }>(`${this.apiBaseUrl}/admin/dashboard/top-routes`)
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.topRoutes.set(response.data);
          }
          this.loadingCharts.set(false);
        },
        error: () => {
          this.loadingCharts.set(false);
        },
      });
  }

  /**
   * Load all dashboard data at once
   */
  loadAll() {
    this.loadKpis();
    this.loadActivity();
    this.loadAlerts();
    this.loadCharts();
  }

  /**
   * Format currency value as FCFA
   */
  fcfa(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Format number with spaces as thousand separator
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  /**
   * Get computed KPI values for convenience
   */
  getKpiValues() {
    const kpis = this.kpis();
    if (!kpis) return null;

    return {
      activeAgencies: kpis.agencies.active,
      totalAgencies: kpis.agencies.total,
      totalUsers: kpis.users.total,
      newUsersThisWeek: kpis.users.newThisWeek,
      reservationsToday: kpis.reservations.today,
      reservationsWeek: kpis.reservations.thisWeek,
      totalBalance: kpis.finance.totalBalanceLocked,
      platformRevenue: kpis.finance.platformRevenue,
      pendingRefunds: kpis.finance.pendingRefunds,
      fillRate: kpis.reservations.fillRate,
      cancellationRate: kpis.reservations.cancellationRate,
      pendingWithdrawals: kpis.withdrawals.pendingCount,
      pendingWithdrawalsAmount: kpis.withdrawals.pendingAmount,
      totalAgents: kpis.agents.total,
      activeClientsToday: kpis.agents.activeClientsToday,
    };
  }
}
