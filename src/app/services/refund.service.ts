import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of } from 'rxjs';

// Types and interfaces
export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface RefundRequest {
  id: number;
  agencyId: number | null;
  agencyName: string;
  clientId: number | null;
  clientName: string;
  clientPhone: string | null;
  reservationId: number | null;
  bookingReference: string | null;
  amount: number;
  netAmount: number;
  reason: string;
  status: RefundStatus;
  forceProcessed: boolean;
  processedByAdminId: number | null;
  processedByAdminName: string | null;
  processedAt: string | null;
  createdAt: string;
  hasNegativeBalance: boolean;
  agentAvailableBalance: number;
  agentReservedBalance: number;
  canStandardRefund: boolean;
}

export interface RefundDetail {
  id: number;
  agency: {
    id: number | null;
    name: string;
    city: string | null;
    phone: string | null;
    hasNegativeBalance: boolean;
    availableBalance: number;
    reservedBalance: number;
  };
  client: {
    id: number | null;
    name: string;
    phone: string | null;
    email: string | null;
  };
  reservation: {
    id: number | null;
    bookingReference: string | null;
    totalAmount: number;
    paymentStatus: string | null;
    createdAt: string | null;
  };
  refund: {
    requestedAmount: number;
    netAmount: number;
    refundedAmount: number;
    reason: string;
    status: RefundStatus;
    adminNote: string | null;
  };
  processing: {
    canStandardRefund: boolean;
    requiresForce: boolean;
    processedByAdminId: number | null;
    processedByAdminName: string | null;
    processedAt: string | null;
    createdAt: string;
  };
}

export interface RefundListResponse {
  success: boolean;
  data: RefundRequest[];
  kpis: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalCompleted: number;
    totalAmountPending: number;
  };
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface RefundActionResponse {
  success: boolean;
  message: string;
  refundId?: number;
  newAgentBalance?: number;
  transactionId?: number;
  status?: RefundStatus;
  hasNegativeBalance?: boolean;
  processedAt?: string;
  forceProcessed?: boolean;
}

export interface RefundCheckResponse {
  success: boolean;
  message: string;
  requiresForce: boolean;
  agentAvailableBalance?: number;
  refundAmount?: number;
}

export interface CreateRefundPayload {
  userId: number;
  reservationId: number;
  amount: number;
  reason: string;
  adminNote?: string;
}

export interface FilterOptions {
  status?: RefundStatus | 'ALL';
  agencyId?: number;
  search?: string;
  forceOnly?: boolean;
}

/**
 * Normalize refund status from backend (lowercase) to frontend type (uppercase)
 */
function normalizeStatus(status: string): RefundStatus {
  const statusMap: Record<string, RefundStatus> = {
    'pending': 'PENDING',
    'approved': 'APPROVED',
    'rejected': 'REJECTED',
    'completed': 'COMPLETED',
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}

function normalizeRefund(r: any): RefundRequest {
  return { ...r, status: normalizeStatus(r.status) };
}

@Injectable({
  providedIn: 'root',
})
export class RefundService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Signals for state management
  readonly refunds = signal<RefundRequest[]>([]);
  readonly currentRefundDetail = signal<RefundDetail | null>(null);
  readonly currentRefundId = signal<number | null>(null);

  // KPI signals
  readonly totalPending = signal<number>(0);
  readonly totalApproved = signal<number>(0);
  readonly totalRejected = signal<number>(0);
  readonly totalCompleted = signal<number>(0);
  readonly totalAmountPending = signal<number>(0);

  // Modal states
  readonly showCreateModal = signal<boolean>(false);
  readonly showStandardRefundModal = signal<number | null>(null);
  readonly showForceRefundModal = signal<number | null>(null);
  readonly showDetailModal = signal<number | null>(null);

  // Loading and error states
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Filter state
  readonly filters = signal<FilterOptions>({});
  readonly currentPage = signal<number>(1);
  readonly perPage = signal<number>(20);
  readonly totalPages = signal<number>(1);

  // Computed signals
  readonly filteredRefunds = computed<RefundRequest[]>(() => {
    const all = this.refunds();
    const filters = this.filters();

    if (!filters.search && (!filters.status || filters.status === 'ALL')) {
      return all;
    }

    return all.filter((r) => {
      const matchesSearch = !filters.search || 
        (r.bookingReference && r.bookingReference.toLowerCase().includes(filters.search!.toLowerCase())) ||
        r.clientName.toLowerCase().includes(filters.search!.toLowerCase()) ||
        r.agencyName.toLowerCase().includes(filters.search!.toLowerCase());
      
      const matchesStatus = !filters.status || filters.status === 'ALL' ||
        r.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  });

  /**
   * Load all refund requests with filters and pagination
   */
  loadRefunds(page: number = 1, perPage: number = 20, filters: FilterOptions = {}) {
    this.loading.set(true);
    this.error.set(null);
    this.currentPage.set(page);
    this.perPage.set(perPage);
    this.filters.set(filters);

    const params: Record<string, string> = {
      page: page.toString(),
      perPage: perPage.toString(),
    };

    if (filters.status && filters.status !== 'ALL') {
      params['status'] = filters.status.toLowerCase();
    }

    if (filters.agencyId) {
      params['agencyId'] = filters.agencyId.toString();
    }

    if (filters.search) {
      params['search'] = filters.search;
    }

    if (filters.forceOnly) {
      params['forceOnly'] = 'true';
    }

    this.http
      .get<RefundListResponse>(`${this.apiBaseUrl}/admin/refunds`, { params })
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement des demandes de remboursement.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.refunds.set(response.data.map(normalizeRefund));
            this.totalPending.set(response.kpis.totalPending);
            this.totalApproved.set(response.kpis.totalApproved);
            this.totalRejected.set(response.kpis.totalRejected);
            this.totalCompleted.set(response.kpis.totalCompleted);
            this.totalAmountPending.set(response.kpis.totalAmountPending);
            this.totalPages.set(response.pagination.totalPages);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Load a single refund request detail
   */
  loadRefundDetail(id: number) {
    this.loading.set(true);
    this.error.set(null);
    this.currentRefundId.set(id);

    this.http
      .get<{ success: boolean; data: RefundDetail }>(`${this.apiBaseUrl}/admin/refunds/${id}`)
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement du détail de la demande de remboursement.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            this.currentRefundDetail.set(response.data);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Process a standard refund (with balance check)
   */
  processStandardRefund(id: number, adminNote?: string) {
    this.loading.set(true);
    this.error.set(null);

    const payload = adminNote ? { adminNote } : {};

    this.http
      .post<RefundActionResponse>(
        `${this.apiBaseUrl}/admin/refunds/${id}/process-standard`,
        payload,
      )
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Échec du remboursement standard.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Update the refund in the list
            this.refunds.update((list) =>
              list.map((r: any) =>
                r.id === id 
                  ? { 
                      ...r, 
                      status: 'COMPLETED' as RefundStatus,
                      processedAt: response.processedAt,
                      hasNegativeBalance: response.hasNegativeBalance ?? false,
                    }
                  : r,
              ),
            );
            
            // Update KPIs
            this.totalPending.update((count) => Math.max(0, count - 1));
            this.totalCompleted.update((count) => count + 1);
            
            // Reload detail if currently viewing this refund
            if (this.currentRefundId() === id) {
              this.loadRefundDetail(id);
            }
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Process a forced refund (override balance check)
   */
  processForcedRefund(id: number, adminNote?: string) {
    this.loading.set(true);
    this.error.set(null);

    const payload = adminNote ? { adminNote } : {};

    this.http
      .post<RefundActionResponse>(
        `${this.apiBaseUrl}/admin/refunds/${id}/process-forced`,
        payload,
      )
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Échec du remboursement forcé.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Update the refund in the list
            this.refunds.update((list) =>
              list.map((r: any) =>
                r.id === id 
                  ? { 
                      ...r, 
                      status: 'COMPLETED' as RefundStatus,
                      processedAt: response.processedAt,
                      hasNegativeBalance: response.hasNegativeBalance ?? false,
                      forceProcessed: true,
                    }
                  : r,
              ),
            );
            
            // Update KPIs
            this.totalPending.update((count) => Math.max(0, count - 1));
            this.totalCompleted.update((count) => count + 1);
            
            // Reload detail if currently viewing this refund
            if (this.currentRefundId() === id) {
              this.loadRefundDetail(id);
            }
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Create a manual refund request
   */
  createManualRefund(payload: CreateRefundPayload) {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<RefundActionResponse>(
        `${this.apiBaseUrl}/admin/refunds/create-manual`,
        payload,
      )
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Échec de la création de la demande de remboursement.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Reload the list to get the new refund
            const page = this.currentPage();
            const perPage = this.perPage();
            const filters = this.filters();
            this.loadRefunds(page, perPage, filters);
            
            // Close create modal
            this.showCreateModal.set(false);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Check if a standard refund is possible for a given refund request
   */
  checkCanStandardRefund(id: number) {
    const refund = this.refunds().find((r) => r.id === id);
    return refund ? refund.canStandardRefund : false;
  }

  /**
   * Get refund by ID from the list
   */
  getRefund(id: number): RefundRequest | null {
    const list = this.refunds();
    return list.find((r) => r.id === id) ?? null;
  }

  /**
   * Get refund detail
   */
  getRefundDetail(): RefundDetail | null {
    return this.currentRefundDetail();
  }

  // Modal control methods
  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  openStandardRefundModal(refundId: number) {
    this.showStandardRefundModal.set(refundId);
  }

  closeStandardRefundModal() {
    this.showStandardRefundModal.set(null);
  }

  openForceRefundModal(refundId: number) {
    this.showForceRefundModal.set(refundId);
  }

  closeForceRefundModal() {
    this.showForceRefundModal.set(null);
  }

  openDetailModal(refundId: number) {
    this.showDetailModal.set(refundId);
    this.loadRefundDetail(refundId);
  }

  closeDetailModal() {
    this.showDetailModal.set(null);
  }

  // Format currency value as FCFA
  fcfa(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
    }).format(value);
  }

  // Format number with spaces as thousand separator
  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  // Refresh the refunds list
  refresh() {
    const page = this.currentPage();
    const perPage = this.perPage();
    const filters = this.filters();
    this.loadRefunds(page, perPage, filters);
  }

  // Get refunds with negative balance agents
  getRefundsWithNegativeBalance(): RefundRequest[] {
    return this.refunds().filter((r) => r.hasNegativeBalance);
  }

  // Get pending refunds
  getPendingRefunds(): RefundRequest[] {
    return this.refunds().filter((r) => r.status === 'PENDING');
  }

  // Get completed refunds
  getCompletedRefunds(): RefundRequest[] {
    return this.refunds().filter((r) => r.status === 'COMPLETED');
  }
}
