import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of } from 'rxjs';

// Types and interfaces
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Withdrawal {
  id: number;
  agencyId: number;
  agencyName: string;
  requestedById: number | null;
  requestedByName: string | null;
  amount: number;
  method: string;
  status: WithdrawalStatus;
  notes: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  forcePaid?: boolean;
  processedByAdminId?: number;
  processedByAdminName?: string;
  remainingBalance?: number;
  totalPendingRefunds?: number;
}

export interface WithdrawalListResponse {
  success: boolean;
  data: Withdrawal[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface WithdrawalActionResponse {
  success: boolean;
  id: number;
  status: WithdrawalStatus;
  message?: string;
  forcePaid?: boolean;
  processedByAdminId?: number;
  processedByAdminName?: string;
  processedAt?: string;
  adminNote?: string;
}

export interface SolvencyCheckResponse {
  success: boolean;
  withdrawalId: number;
  agencyId: number;
  agencyName: string;
  withdrawalAmount: number;
  solvent: boolean;
  message: string;
  remainingBalance: number;
  totalPendingRefunds: number;
  requiresForcePay: boolean;
}

export interface FilterOptions {
  status?: WithdrawalStatus | 'ALL';
  agencyId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Callback used to report the outcome of an approve attempt back to the caller,
// since the HTTP call is asynchronous and the page needs to react (e.g. open the
// force-pay modal) once the result -- success or insolvency failure -- is known.
export type ApproveResultCallback = (result: { success: boolean; message?: string }) => void;

/**
 * The backend returns `status` in lowercase (e.g. "pending"), but the rest of the
 * front-end (type, template @switch cases, filters, tab counts) is written against
 * the uppercase literals 'PENDING' | 'APPROVED' | 'REJECTED'. Normalize as soon as
 * data comes in from the API so every comparison downstream just works.
 */
function normalizeStatus(status: string): WithdrawalStatus {
  return status.toUpperCase() as WithdrawalStatus;
}

function normalizeWithdrawal(w: Withdrawal): Withdrawal {
  return { ...w, status: normalizeStatus(w.status as unknown as string) };
}

@Injectable({
  providedIn: 'root',
})
export class WithdrawalService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Signals for state management
  readonly withdrawals = signal<Withdrawal[]>([]);
  readonly totalCount = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly perPage = signal<number>(20);
  readonly totalPages = signal<number>(1);

  // Filter state
  readonly filters = signal<FilterOptions>({});

  // Loading and error states
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Modal states
  readonly showApproveModal = signal<number | null>(null); // withdrawal ID to approve
  readonly showRejectModal = signal<number | null>(null); // withdrawal ID to reject
  readonly showDetailModal = signal<number | null>(null); // withdrawal ID to view details
  readonly showSolvencyWarningModal = signal<number | null>(null); // withdrawal ID with solvency warning
  readonly solvencyWarningMessage = signal<string>(''); // Warning message for solvency modal

  // Computed signals
  readonly filteredWithdrawals = computed<Withdrawal[]>(() => {
    const all = this.withdrawals();
    const filters = this.filters();

    if (!filters.status || filters.status === 'ALL') {
      return all;
    }

    return all.filter((w) => w.status === filters.status);
  });

  readonly countForStatus = computed<Record<string, number>>(() => {
    const all = this.withdrawals();
    return {
      ALL: all.length,
      PENDING: all.filter((w) => w.status === 'PENDING').length,
      APPROVED: all.filter((w) => w.status === 'APPROVED').length,
      REJECTED: all.filter((w) => w.status === 'REJECTED').length,
    };
  });

  /**
   * Load withdrawals with optional filters
   */
  loadWithdrawals(page: number = 1, perPage: number = 20, filters: FilterOptions = {}) {
    this.loading.set(true);
    this.error.set(null);
    this.currentPage.set(page);
    this.perPage.set(perPage);
    this.filters.set(filters);

    // Build query parameters
    const params: Record<string, string> = {
      page: page.toString(),
      perPage: perPage.toString(),
    };

    if (filters.status && filters.status !== 'ALL') {
      // The API expects lowercase status values ("pending", "approved", "rejected")
      params['status'] = filters.status.toLowerCase();
    }

    if (filters.agencyId) {
      params['agencyId'] = filters.agencyId.toString();
    }

    if (filters.dateFrom) {
      params['dateFrom'] = filters.dateFrom;
    }

    if (filters.dateTo) {
      params['dateTo'] = filters.dateTo;
    }

    if (filters.search) {
      params['search'] = filters.search;
    }

    this.http
      .get<WithdrawalListResponse>(`${this.apiBaseUrl}/admin/withdrawals`, { params })
      .pipe(
        catchError((error) => {
          this.error.set('Échec du chargement des demandes de retrait.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.withdrawals.set(response.data.map(normalizeWithdrawal));
            this.totalCount.set(response.pagination.total);
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
   * Load a single withdrawal by ID
   */
  loadWithdrawal(id: number) {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<{ success: boolean; data: Withdrawal }>(`${this.apiBaseUrl}/admin/withdrawals/${id}`)
      .pipe(
        catchError((error) => {
          this.error.set('Demande de retrait introuvable.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            const normalized = normalizeWithdrawal(response.data);
            // Update the specific withdrawal in the list
            this.withdrawals.update((list) =>
              list.map((w) => (w.id === normalized.id ? normalized : w)),
            );
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Reject a withdrawal request
   */
  rejectWithdrawal(id: number, adminNote: string) {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<WithdrawalActionResponse>(
        `${this.apiBaseUrl}/admin/withdrawals/${id}/reject`,
        { note: adminNote },
      )
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Échec du rejet.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Update the withdrawal status in the list
            this.withdrawals.update((list) =>
              list.map((w) =>
                w.id === id
                  ? {
                      ...w,
                      status: 'REJECTED' as WithdrawalStatus,
                      adminNote,
                      processedAt: new Date().toISOString(),
                    }
                  : w,
              ),
            );
            this.showRejectModal.set(null);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Open approve modal for a withdrawal
   */
  openApproveModal(id: number) {
    this.showApproveModal.set(id);
  }

  /**
   * Close approve modal
   */
  closeApproveModal() {
    this.showApproveModal.set(null);
  }

  /**
   * Open reject modal for a withdrawal
   */
  openRejectModal(id: number) {
    this.showRejectModal.set(id);
  }

  /**
   * Close reject modal
   */
  closeRejectModal() {
    this.showRejectModal.set(null);
  }

  /**
   * Open detail modal for a withdrawal
   */
  openDetailModal(id: number) {
    this.showDetailModal.set(id);
  }

  /**
   * Close detail modal
   */
  closeDetailModal() {
    this.showDetailModal.set(null);
  }

  /**
   * Get withdrawal by ID from the list
   */
  getWithdrawal(id: number): Withdrawal | null {
    const list = this.withdrawals();
    return list.find((w) => w.id === id) ?? null;
  }

  /**
   * Check solvency for a withdrawal request
   */
  checkSolvency(id: number) {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<SolvencyCheckResponse>(`${this.apiBaseUrl}/admin/withdrawals/${id}/check-solvency`)
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || 'Échec de la vérification de solvabilité.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Update the withdrawal with solvency info
            this.withdrawals.update((list) =>
              list.map((w) =>
                w.id === id
                  ? {
                      ...w,
                      remainingBalance: response.remainingBalance,
                      totalPendingRefunds: response.totalPendingRefunds,
                    }
                  : w,
              ),
            );
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /**
   * Approve a withdrawal request with solvency check and force pay option.
   *
   * @param onResult optional callback invoked once the request settles. When the
   * backend refuses the approval because the agency is insolvent (success: false),
   * the caller can use this to react -- e.g. open the force-pay warning modal --
   * without having to poll the `error` signal.
   */
  approveWithdrawalWithSolvency(
    id: number,
    adminNote?: string,
    forcePay: boolean = false,
    onResult?: ApproveResultCallback,
  ) {
    this.loading.set(true);
    this.error.set(null);

    const payload: { note?: string; forcePay?: boolean } = {};
    if (adminNote) {
      payload.note = adminNote;
    }
    if (forcePay) {
      payload.forcePay = true;
    }

    this.http
      .post<WithdrawalActionResponse>(
        `${this.apiBaseUrl}/admin/withdrawals/${id}/approve`,
        payload,
      )
      .pipe(
        catchError((error) => {
          const message = error?.error?.message || 'Échec de l\'approbation.';
          this.error.set(message);
          this.loading.set(false);
          onResult?.({ success: false, message });
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Update the withdrawal status in the list
            this.withdrawals.update((list) =>
              list.map((w) =>
                w.id === id
                  ? {
                      ...w,
                      status: 'APPROVED' as WithdrawalStatus,
                      processedAt: response.processedAt || new Date().toISOString(),
                      forcePaid: response.forcePaid,
                      processedByAdminId: response.processedByAdminId,
                      processedByAdminName: response.processedByAdminName,
                    }
                  : w,
              ),
            );
            this.showApproveModal.set(null);
            onResult?.({ success: true });
          } else if (response && !response.success) {
            // Handle solvency failure
            const message = response.message || 'Risque financier détecté.';
            this.error.set(message);
            onResult?.({ success: false, message });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
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
   * Get initials from agency name
   */
  getInitials(agencyName: string): string {
    return agencyName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /**
   * Refresh the withdrawals list
   */
  refresh() {
    const page = this.currentPage();
    const perPage = this.perPage();
    const filters = this.filters();
    this.loadWithdrawals(page, perPage, filters);
  }

  /**
   * Open solvency warning modal with message
   */
  openSolvencyWarningModal(id: number, message: string) {
    this.showSolvencyWarningModal.set(id);
    this.solvencyWarningMessage.set(message);
  }

  /**
   * Close solvency warning modal
   */
  closeSolvencyWarningModal() {
    this.showSolvencyWarningModal.set(null);
    this.solvencyWarningMessage.set('');
  }

  /**
   * Approve with force pay (bypass solvency check)
   */
  approveWithForcePay(id: number, adminNote?: string, onResult?: ApproveResultCallback) {
    this.approveWithdrawalWithSolvency(id, adminNote, true, onResult);
    this.closeSolvencyWarningModal();
  }
}