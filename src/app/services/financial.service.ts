import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of } from 'rxjs';

// Types and interfaces for Revenue Analysis

export interface RevenueAnalysisKpis {
  platformRevenue: number;
  platformFees: {
    platformFees: number;
    adminCredits: number;
    adminDebits: number;
  };
  netEarnings: number;
  revenueGrowthRate: number;
}

export interface RevenueByAgency {
  agency: string;
  revenue: number;
  color: string;
}

export interface RevenueByRoute {
  route: string;
  revenue: number;
}

export interface PaymentDistribution {
  label: string;
  value: number;
  color: string;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color: string;
  dotClass: string;
  fill?: string;
}

export interface RevenueAnalysisData {
  kpis: RevenueAnalysisKpis;
  revenueByAgency: RevenueByAgency[];
  revenueByRoute: RevenueByRoute[];
  paymentDistribution: PaymentDistribution[];
  chartData: {
    labels: string[];
    caSeries: number[];
    beneficeSeries: number[];
    commissionsSeries: number[];
  };
  refundsTrend: {
    labels: string[];
    series: number[];
  };
}

export interface RevenueAnalysisResponse {
  success: boolean;
  data: RevenueAnalysisData;
  timestamp: string;
}

// Types and interfaces for Financial Stats

export interface FinancialStatsKpis {
  grossMerchandiseValue: number;
  totalWalletBalance: number;
  availableBalance: number;
  reservedBalance: number;
  platformBalance: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalRefunds: number;
  pendingRefunds: number;
  transactionVolume: number;
  gmvGrowthRate: number;
  netMargin: number;
  averageBasket: number;
}

export interface FinancialDetailByAgency {
  agency: string;
  ca: number;
  commission: number;
  netRevenue: number;
  margin: number;
  transactions: number;
}

export interface WalletBalances {
  total: number;
  available: number;
  reserved: number;
}

export interface WithdrawalMetrics {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface RefundMetrics {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface FinancialStatsData {
  kpis: FinancialStatsKpis;
  revenueByAgency: RevenueByAgency[];
  chartData: {
    labels: string[];
    caSeries: number[];
    beneficeSeries: number[];
    commissionsSeries: number[];
  };
  financialDetailByAgency: FinancialDetailByAgency[];
  walletBalances: WalletBalances;
  withdrawals: WithdrawalMetrics;
  refunds: RefundMetrics;
}

export interface FinancialStatsResponse {
  success: boolean;
  data: FinancialStatsData;
  timestamp: string;
}

// Date range filter types
export type DateRange = {
  startDate: string;
  endDate: string;
};

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface DateFilter {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
}

// Transaction types and interfaces
export type TransactionType = 'PAYMENT' | 'WITHDRAWAL' | 'REFUND' | 'COMMISSION' | 'TOPUP' | 'ADJUSTMENT' | 'SYSTEM' | 'UNKNOWN';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface TransactionAgency {
  id: number | null;
  name: string | null;
}

export interface TransactionWallet {
  id: number | null;
}

export interface TransactionReservation {
  id: number | null;
  ref: string | null;
  amount: number | null;
}

export interface TransactionPayment {
  reference: string | null;
  operator: string | null;
  status: string | null;
}

export interface TransactionRefund {
  id: number | null;
  amount: number | null;
  status: string | null;
}

export interface TransactionWithdrawal {
  id: number | null;
  amount: number | null;
  status: string | null;
}

export interface TransactionAdmin {
  id: number | null;
  name: string | null;
  email: string | null;
}

export interface Transaction {
  id: string;
  source: string;
  type: TransactionType;
  amount: number;
  feeAmount: number;
  balanceAfter: number;
  description: string | null;
  date: string;
  agency: TransactionAgency;
  wallet: TransactionWallet;
  status: TransactionStatus;
  reservation?: TransactionReservation;
  payment?: TransactionPayment;
  refund?: TransactionRefund;
  withdrawal?: TransactionWithdrawal;
  admin?: TransactionAdmin;
}

export interface TransactionStats {
  totalCount: number;
  totalVolume: number;
  totalFees: number;
  countByType: Record<string, number>;
  volumeByType: Record<string, number>;
  countByStatus: Record<string, number>;
}

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: 'ALL' | TransactionType;
  status?: 'ALL' | TransactionStatus;
  agencyId?: number;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface TransactionHistoryData {
  transactions: Transaction[];
  stats: TransactionStats;
}

export interface TransactionHistoryResponse {
  success: boolean;
  data: TransactionHistoryData;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class FinancialService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // State for Revenue Analysis
  readonly revenueAnalysis = signal<RevenueAnalysisData | null>(null);
  readonly loadingRevenueAnalysis = signal<boolean>(false);
  readonly errorRevenueAnalysis = signal<string | null>(null);

  // State for Financial Stats
  readonly financialStats = signal<FinancialStatsData | null>(null);
  readonly loadingFinancialStats = signal<boolean>(false);
  readonly errorFinancialStats = signal<string | null>(null);

  // State for Transaction History
  readonly transactionHistory = signal<TransactionHistoryData | null>(null);
  readonly loadingTransactionHistory = signal<boolean>(false);
  readonly errorTransactionHistory = signal<string | null>(null);
  readonly transactionPagination = signal<{
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  } | null>(null);
  readonly transactionFilter = signal<TransactionFilter>({});

  // Date filter state
  readonly dateFilter = signal<DateFilter>({
    period: 'monthly',
    startDate: this.getStartDate('monthly'),
    endDate: new Date().toISOString().split('T')[0],
  });



  /**
   * Load revenue analysis data
   */
  loadRevenueAnalysis(filter?: DateFilter) {
    this.loadingRevenueAnalysis.set(true);
    this.errorRevenueAnalysis.set(null);

    const filterToUse = filter || this.dateFilter();
    
    // Update the service's date filter if provided
    if (filter) {
      this.dateFilter.set(filter);
    }
    
    const params: Record<string, string> = {
      period: filterToUse.period,
    };

    if (filterToUse.startDate) {
      params['start_date'] = filterToUse.startDate;
    }
    if (filterToUse.endDate) {
      params['end_date'] = filterToUse.endDate;
    }

    this.http
      .get<RevenueAnalysisResponse>(`${this.apiBaseUrl}/admin/financial/revenue-analysis`, { params })
      .pipe(
        catchError((error) => {
          this.errorRevenueAnalysis.set('Échec du chargement de l\'analyse des revenus.');
          this.loadingRevenueAnalysis.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.revenueAnalysis.set(response.data);
          }
          this.loadingRevenueAnalysis.set(false);
        },
        error: () => {
          this.loadingRevenueAnalysis.set(false);
        },
      });
  }

  /**
   * Load financial stats data
   */
  loadFinancialStats(filter?: DateFilter) {
    this.loadingFinancialStats.set(true);
    this.errorFinancialStats.set(null);

    const filterToUse = filter || this.dateFilter();
    
    // Update the service's date filter if provided
    if (filter) {
      this.dateFilter.set(filter);
    }
    
    const params: Record<string, string> = {
      period: filterToUse.period,
    };

    if (filterToUse.startDate) {
      params['start_date'] = filterToUse.startDate;
    }
    if (filterToUse.endDate) {
      params['end_date'] = filterToUse.endDate;
    }

    this.http
      .get<FinancialStatsResponse>(`${this.apiBaseUrl}/admin/financial/stats`, { params })
      .pipe(
        catchError((error) => {
          this.errorFinancialStats.set('Échec du chargement des statistiques financières.');
          this.loadingFinancialStats.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.financialStats.set(response.data);
          }
          this.loadingFinancialStats.set(false);
        },
        error: () => {
          this.loadingFinancialStats.set(false);
        },
      });
  }

  /**
   * Load transaction history data with optional filters
   */
  loadTransactionHistory(filter?: TransactionFilter) {
    this.loadingTransactionHistory.set(true);
    this.errorTransactionHistory.set(null);

    const filterToUse = filter || this.transactionFilter();
    
    // Update the service's transaction filter if provided
    if (filter) {
      this.transactionFilter.set(filter);
    }
    
    // Build query parameters
    const params: Record<string, string | number> = {};
    
    if (filterToUse.startDate) {
      params['start_date'] = filterToUse.startDate;
    }
    if (filterToUse.endDate) {
      params['end_date'] = filterToUse.endDate;
    }
    if (filterToUse.type) {
      params['type'] = filterToUse.type;
    }
    if (filterToUse.status) {
      params['status'] = filterToUse.status;
    }
    if (filterToUse.agencyId) {
      params['agency_id'] = filterToUse.agencyId;
    }
    if (filterToUse.search) {
      params['search'] = filterToUse.search;
    }
    if (filterToUse.page) {
      params['page'] = filterToUse.page;
    }
    if (filterToUse.perPage) {
      params['per_page'] = filterToUse.perPage;
    }

    this.http
      .get<TransactionHistoryResponse>(`${this.apiBaseUrl}/admin/financial/transactions`, { params })
      .pipe(
        catchError((error) => {
          this.errorTransactionHistory.set('Échec du chargement de l\'historique des transactions.');
          this.loadingTransactionHistory.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.transactionHistory.set(response.data);
            this.transactionPagination.set(response.pagination);
          }
          this.loadingTransactionHistory.set(false);
        },
        error: () => {
          this.loadingTransactionHistory.set(false);
        },
      });
  }

  /**
   * Load more transactions (pagination)
   */
  loadMoreTransactions(page: number, perPage: number = 50) {
    const currentFilter = this.transactionFilter();
    this.loadTransactionHistory({
      ...currentFilter,
      page,
      perPage,
    });
  }

  /**
   * Update transaction filter
   */
  updateTransactionFilter(filter: TransactionFilter) {
    this.transactionFilter.set(filter);
  }

  /**
   * Reset transaction filter
   */
  resetTransactionFilter() {
    this.transactionFilter.set({});
  }

  /**
   * Get transaction type label
   */
  getTransactionTypeLabel(type: TransactionType): string {
    const labels: Record<TransactionType, string> = {
      PAYMENT: 'Paiement',
      WITHDRAWAL: 'Retrait',
      REFUND: 'Remboursement',
      COMMISSION: 'Commission',
      TOPUP: 'Recharge',
      ADJUSTMENT: 'Ajustement',
      SYSTEM: 'Système',
      UNKNOWN: 'Inconnu',
    };
    return labels[type] || type;
  }

  /**
   * Get transaction status label
   */
  getTransactionStatusLabel(status: TransactionStatus): string {
    const labels: Record<TransactionStatus, string> = {
      SUCCESS: 'Succès',
      PENDING: 'En attente',
      FAILED: 'Échec',
    };
    return labels[status] || status;
  }

  /**
   * Get transaction icon based on type
   */
  getTransactionTypeIcon(type: TransactionType): string {
    const icons: Record<TransactionType, string> = {
      PAYMENT: 'fa-credit-card',
      WITHDRAWAL: 'fa-hand-holding-dollar',
      REFUND: 'fa-rotate-left',
      COMMISSION: 'fa-percent',
      TOPUP: 'fa-plus',
      ADJUSTMENT: 'fa-exchange-alt',
      SYSTEM: 'fa-cog',
      UNKNOWN: 'fa-question-circle',
    };
    return icons[type] || 'fa-question-circle';
  }

  /**
   * Update date filter
   */
  updateDateFilter(filter: DateFilter) {
    this.dateFilter.set(filter);
  }

  /**
   * Update period
   */
  updatePeriod(period: PeriodType) {
    this.dateFilter.update(current => ({
      ...current,
      period,
      startDate: this.getStartDate(period),
      endDate: new Date().toISOString().split('T')[0],
    }));
  }

  /**
   * Update custom date range
   */
  updateDateRange(startDate: string, endDate: string) {
    this.dateFilter.update(current => ({
      ...current,
      startDate,
      endDate,
      period: 'custom',
    }));
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
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Get start date based on period
   */
  private getStartDate(period: PeriodType): string {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split('T')[0];
      case 'weekly':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().split('T')[0];
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() - 8, now.getDate()).toISOString().split('T')[0];
    }
  }

  /**
   * Get chart series for line chart
   */
  getRevenueAnalysisChartSeries(): ChartSeries[] {
    const data = this.revenueAnalysis();
    if (!data) return [];

    return [
      { name: 'CA', data: data.chartData.caSeries, color: '#2563eb', dotClass: 'bg-green-600' },
      { name: 'Bénéfice', data: data.chartData.beneficeSeries, color: '#16a34a', dotClass: 'bg-green-600' },
      { name: 'Commissions', data: data.chartData.commissionsSeries, color: '#9333ea', dotClass: 'bg-violet-600' },
    ];
  }

  /**
   * Get chart series for refunds trend
   */
  getRefundsTrendSeries(): ChartSeries[] {
    const data = this.revenueAnalysis();
    if (!data) return [];

    return [
      { name: 'Remboursements', data: data.refundsTrend.series, color: '#dc2626', fill: '#dc2626', dotClass: 'bg-red-500' },
    ];
  }

  /**
   * Get agency bar data
   */
  getAgencyBarData(): { label: string; value: number; color: string }[] {
    const data = this.revenueAnalysis();
    if (!data) return [];

    return data.revenueByAgency.map(a => ({
      label: a.agency.split(' ')[0],
      value: a.revenue,
      color: a.color,
    }));
  }

  /**
   * Get financial stats chart series
   */
  getFinancialStatsChartSeries(): ChartSeries[] {
    const data = this.financialStats();
    if (!data) return [];

    return [
      { name: 'CA (M FCFA)', data: data.chartData.caSeries, color: '#2563eb', fill: '#2563eb', dotClass: 'bg-green-600' },
    ];
  }

  /**
   * Get benefit vs commissions chart series
   */
  getBenefitVsCommissionsSeries(): ChartSeries[] {
    const data = this.financialStats();
    if (!data) return [];

    return [
      { name: 'Bénéfice', data: data.chartData.beneficeSeries, color: '#16a34a', dotClass: 'bg-green-600' },
      { name: 'Commissions', data: data.chartData.commissionsSeries, color: '#9333ea', dotClass: 'bg-violet-600' },
    ];
  }

  /**
   * Get financial stats agency bar data
   */
  getFinancialStatsAgencyBarData(): { label: string; value: number; color: string }[] {
    const data = this.financialStats();
    if (!data) return [];

    return data.revenueByAgency.map(a => ({
      label: a.agency.split(' ')[0],
      value: a.revenue,
      color: a.color,
    }));
  }

  /**
   * Get payment distribution data for donut chart
   */
  getPaymentDistribution(): PaymentDistribution[] {
    const data = this.revenueAnalysis();
    return data?.paymentDistribution ?? [];
  }

  /**
   * Get KPIs for revenue analysis
   */
  getRevenueAnalysisKpis() {
    const data = this.revenueAnalysis();
    return data?.kpis ?? null;
  }

  /**
   * Get KPIs for financial stats
   */
  getFinancialStatsKpis() {
    const data = this.financialStats();
    return data?.kpis ?? null;
  }

  /**
   * Get financial detail by agency
   */
  getFinancialDetailByAgency() {
    const data = this.financialStats();
    return data?.financialDetailByAgency ?? [];
  }

  /**
   * Refresh all datasets
   */
  refreshAll() {
    this.loadRevenueAnalysis();
    this.loadFinancialStats();
    this.loadTransactionHistory();
  }
}