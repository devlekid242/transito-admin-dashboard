import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment.prod";
import { catchError, of } from "rxjs";

// Types and interfaces
export interface AgencyWallet {
	id: number;
	agencyId: number;
	agencyName: string;
	available: number;
	reserved: number;
	blocked: number;
	total: number;
	currency: string;
	frozen: boolean;
	frozenAt?: string;
	frozenByAdminId?: number;
	frozenByAdminName?: string;
	lastTransaction?: string;
	pendingWithdrawals?: number;
	pendingRefunds?: number;
	unvalidatedTickets?: number;
}

export interface WalletDetail {
	id: number;
	agencyId: number;
	agency: string;
	available: number;
	reserved: number;
	blocked: number;
	total: number;
	frozen: boolean;
	frozenAt?: string;
	frozenByAdminId?: number;
	frozenByAdminName?: string;
	currency: string;
	createdAt?: string;
}

export interface WalletKPIs {
	totalIn: number;
	totalOut: number;
	agencyRevenue: number;
	platformCommission: number;
	refundTotal: number;
	netBalance: number;
	transactionCount: number;
	withdrawalCount: number;
	blockedBalance: number;
	availableForWithdrawal: number;
}

export interface WalletTransaction {
	id: number;
	type: string;
	source: string;
	label: string;
	amount: number;
	balanceAfter: number;
	date: string;
	adminId?: number;
	adminName?: string;
	adminReason?: string;
}

export interface Withdrawal {
	id: number;
	amount: number;
	method: string;
	status: string;
	notes?: string;
	adminNote?: string;
	date: string;
	processedAt?: string;
	remainingBalance: number;
}

export interface WalletDetailResponse {
	wallet: WalletDetail;
	kpis: WalletKPIs;
	transactions: WalletTransaction[];
	withdrawals: Withdrawal[];
}

export interface WalletListResponse {
	success: boolean;
	data: AgencyWallet[];
	kpis: {
		totalAvailable: number;
		totalReserved: number;
		totalBlocked: number;
		totalBalance: number;
		totalWallets: number;
		frozenWallets: number;
	};
	pagination: {
		total: number;
		page: number;
		perPage: number;
		totalPages: number;
	};
}

export interface WalletActionResponse {
	success: boolean;
	message: string;
	walletId?: number;
	newBalance?: number;
	transactionId?: number;
	transaction?: WalletTransaction;
	frozen?: boolean;
	frozenAt?: string;
	frozenByAdminId?: number;
	frozenByAdminName?: string;
	reason?: string;
}

export interface FilterOptions {
	search?: string;
	status?: "normal" | "frozen" | "all";
}

@Injectable({
	providedIn: "root",
})
export class WalletService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signals for state management
	readonly wallets = signal<AgencyWallet[]>([]);
	readonly totalAvailable = signal<number>(0);
	readonly totalReserved = signal<number>(0);
	readonly totalBlocked = signal<number>(0);
	readonly totalBalance = signal<number>(0);
	readonly totalWallets = signal<number>(0);
	readonly frozenWallets = signal<number>(0);

	// Loading and error states
	readonly loading = signal<boolean>(false);
	readonly error = signal<string | null>(null);

	// Detail view state
	readonly currentWalletDetail = signal<WalletDetailResponse | null>(null);
	readonly currentWalletId = signal<number | null>(null);

	// Modal states
	readonly showCreditModal = signal<number | null>(null);
	readonly showDebitModal = signal<number | null>(null);
	readonly showFreezeModal = signal<number | null>(null);
	readonly showUnfreezeModal = signal<number | null>(null);

	// Filter state
	readonly filters = signal<FilterOptions>({});
	readonly currentPage = signal<number>(1);
	readonly perPage = signal<number>(20);
	readonly totalPages = signal<number>(1);

	// Computed signals
	readonly filteredWallets = computed<AgencyWallet[]>(() => {
		const all = this.wallets();
		const filters = this.filters();

		if (!filters.search && (!filters.status || filters.status === "all")) {
			return all;
		}

		return all.filter((w) => {
			const matchesSearch =
				!filters.search ||
				w.agencyName
					.toLowerCase()
					.includes(filters.search!.toLowerCase()) ||
				w.id.toString().includes(filters.search!);

			const matchesStatus =
				!filters.status ||
				filters.status === "all" ||
				(filters.status === "frozen" && w.frozen) ||
				(filters.status === "normal" && !w.frozen);

			return matchesSearch && matchesStatus;
		});
	});

	/**
	 * Load all wallets with filters and pagination
	 */
	loadWallets(
		page: number = 1,
		perPage: number = 20,
		filters: FilterOptions = {},
	) {
		this.loading.set(true);
		this.error.set(null);
		this.currentPage.set(page);
		this.perPage.set(perPage);
		this.filters.set(filters);

		const params: Record<string, string> = {
			page: page.toString(),
			perPage: perPage.toString(),
		};

		if (filters.search) {
			params["search"] = filters.search;
		}

		if (filters.status && filters.status !== "all") {
			params["status"] = filters.status;
		}

		this.http
			.get<WalletListResponse>(`${this.apiBaseUrl}/admin/wallets`, {
				params,
			})
			.pipe(
				catchError((error) => {
					this.error.set("Échec du chargement des portefeuilles.");
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						this.wallets.set(response.data);
						this.totalAvailable.set(response.kpis.totalAvailable);
						this.totalReserved.set(response.kpis.totalReserved);
						this.totalBlocked.set(response.kpis.totalBlocked);
						this.totalBalance.set(response.kpis.totalBalance);
						this.totalWallets.set(response.kpis.totalWallets);
						this.frozenWallets.set(response.kpis.frozenWallets);
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
	 * Load a single wallet detail
	 */
	loadWalletDetail(id: number) {
		this.loading.set(true);
		this.error.set(null);
		this.currentWalletId.set(id);

		this.http
			.get<{ success: boolean; data: WalletDetailResponse }>(
				`${this.apiBaseUrl}/admin/wallets/${id}`,
			)
			.pipe(
				catchError((error) => {
					this.error.set(
						"Échec du chargement du détail du portefeuille.",
					);
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success && response.data) {
						this.currentWalletDetail.set(response.data);
					}
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	/**
	 * Manually credit a wallet
	 */
	creditWallet(id: number, amount: number, reason: string) {
		this.loading.set(true);
		this.error.set(null);

		const payload = { amount, reason };

		this.http
			.post<WalletActionResponse>(
				`${this.apiBaseUrl}/admin/wallets/${id}/credit`,
				payload,
			)
			.pipe(
				catchError((error) => {
					this.error.set(error?.error?.message || "Échec du crédit.");
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						// Update the wallet in the list
						this.wallets.update((list) =>
							list.map((w) =>
								w.id === id
									? {
											...w,
											available:
												response.newBalance ||
												w.available,
										}
									: w,
							),
						);

						// Update totals
						if (response.newBalance !== undefined) {
							this.totalAvailable.update((total) => {
								const oldWallet = this.wallets().find(
									(w) => w.id === id,
								);
								if (oldWallet) {
									return (
										total -
										oldWallet.available +
										response.newBalance!
									);
								}
								return total;
							});
						}

						// Reload detail if currently viewing this wallet
						if (this.currentWalletId() === id) {
							this.loadWalletDetail(id);
						}

						this.showCreditModal.set(null);
					}
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	/**
	 * Manually debit a wallet
	 */
	debitWallet(id: number, amount: number, reason: string) {
		this.loading.set(true);
		this.error.set(null);

		const payload = { amount, reason };

		this.http
			.post<WalletActionResponse>(
				`${this.apiBaseUrl}/admin/wallets/${id}/debit`,
				payload,
			)
			.pipe(
				catchError((error) => {
					this.error.set(error?.error?.message || "Échec du débit.");
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						// Update the wallet in the list
						this.wallets.update((list) =>
							list.map((w) =>
								w.id === id
									? {
											...w,
											available:
												response.newBalance ||
												w.available,
										}
									: w,
							),
						);

						// Update totals
						if (response.newBalance !== undefined) {
							this.totalAvailable.update((total) => {
								const oldWallet = this.wallets().find(
									(w) => w.id === id,
								);
								if (oldWallet) {
									return (
										total -
										oldWallet.available +
										response.newBalance!
									);
								}
								return total;
							});
						}

						// Reload detail if currently viewing this wallet
						if (this.currentWalletId() === id) {
							this.loadWalletDetail(id);
						}

						this.showDebitModal.set(null);
					}
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	/**
	 * Freeze a wallet
	 */
	freezeWallet(id: number, reason?: string) {
		this.loading.set(true);
		this.error.set(null);

		const payload = reason ? { reason } : {};

		this.http
			.post<WalletActionResponse>(
				`${this.apiBaseUrl}/admin/wallets/${id}/freeze`,
				payload,
			)
			.pipe(
				catchError((error) => {
					this.error.set(
						error?.error?.message ||
							"Échec du gel du portefeuille.",
					);
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						// Update the wallet in the list
						this.wallets.update((list) =>
							list.map((w) =>
								w.id === id
									? {
											...w,
											frozen: true,
											frozenAt: response.frozenAt,
											frozenByAdminId:
												response.frozenByAdminId,
											frozenByAdminName:
												response.frozenByAdminName,
										}
									: w,
							),
						);

						// Update frozen wallets count
						this.frozenWallets.update((count) => {
							const wallet = this.wallets().find(
								(w) => w.id === id,
							);
							return wallet && !wallet.frozen ? count + 1 : count;
						});

						// Reload detail if currently viewing this wallet
						if (this.currentWalletId() === id) {
							this.loadWalletDetail(id);
						}

						this.showFreezeModal.set(null);
					}
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	/**
	 * Unfreeze a wallet
	 */
	unfreezeWallet(id: number, reason?: string) {
		this.loading.set(true);
		this.error.set(null);

		const payload = reason ? { reason } : {};

		this.http
			.post<WalletActionResponse>(
				`${this.apiBaseUrl}/admin/wallets/${id}/unfreeze`,
				payload,
			)
			.pipe(
				catchError((error) => {
					this.error.set(
						error?.error?.message ||
							"Échec du dégel du portefeuille.",
					);
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						// Update the wallet in the list
						this.wallets.update((list) =>
							list.map((w) =>
								w.id === id
									? {
											...w,
											frozen: false,
											frozenAt: undefined,
											frozenByAdminId: undefined,
											frozenByAdminName: undefined,
										}
									: w,
							),
						);

						// Update frozen wallets count
						this.frozenWallets.update((count) => {
							const wallet = this.wallets().find(
								(w) => w.id === id,
							);
							return wallet && wallet.frozen ? count - 1 : count;
						});

						// Reload detail if currently viewing this wallet
						if (this.currentWalletId() === id) {
							this.loadWalletDetail(id);
						}

						this.showUnfreezeModal.set(null);
					}
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	/**
	 * Get wallet balance summary
	 */
	getWalletSummary(id: number) {
		this.loading.set(true);
		this.error.set(null);

		this.http
			.get<{
				success: boolean;
				walletId: number;
				available: number;
				reserved: number;
				blocked: number;
				total: number;
				availableForWithdrawal: number;
				pendingRefunds: number;
				unvalidatedTickets: number;
			}>(`${this.apiBaseUrl}/admin/wallets/${id}/summary`)
			.pipe(
				catchError((error) => {
					this.error.set(
						"Échec du chargement du résumé du portefeuille.",
					);
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success) {
						// Update the wallet in the list with new data
						this.wallets.update((list) =>
							list.map((w) =>
								w.id === response.walletId
									? {
											...w,
											available: response.available,
											reserved: response.reserved,
											blocked: response.blocked,
											total: response.total,
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

	// Modal control methods
	openCreditModal(walletId: number) {
		this.showCreditModal.set(walletId);
	}

	closeCreditModal() {
		this.showCreditModal.set(null);
	}

	openDebitModal(walletId: number) {
		this.showDebitModal.set(walletId);
	}

	closeDebitModal() {
		this.showDebitModal.set(null);
	}

	openFreezeModal(walletId: number) {
		this.showFreezeModal.set(walletId);
	}

	closeFreezeModal() {
		this.showFreezeModal.set(null);
	}

	openUnfreezeModal(walletId: number) {
		this.showUnfreezeModal.set(walletId);
	}

	closeUnfreezeModal() {
		this.showUnfreezeModal.set(null);
	}

	// Get wallet by ID from the list
	getWallet(id: number): AgencyWallet | null {
		const list = this.wallets();
		return list.find((w) => w.id === id) ?? null;
	}

	// Get wallet detail
	getWalletDetail(): WalletDetailResponse | null {
		return this.currentWalletDetail();
	}

	// Format currency value as FCFA
	fcfa(value: number): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "XAF",
			currencyDisplay: "narrowSymbol",
			minimumFractionDigits: 0,
		}).format(value);
	}

	// Format number with spaces as thousand separator
	formatNumber(value: number): string {
		return new Intl.NumberFormat("fr-FR").format(value);
	}

	// Get initials from agency name
	getInitials(agencyName: string): string {
		return agencyName
			.split(" ")
			.map((word) => word[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	// Calculate percentage
	pct(part: number, total: number): number {
		return total === 0 ? 0 : Math.round((part / total) * 100);
	}

	// Refresh the wallets list
	refresh() {
		const page = this.currentPage();
		const perPage = this.perPage();
		const filters = this.filters();
		this.loadWallets(page, perPage, filters);
	}

	// Refresh wallet detail
	refreshDetail(id: number) {
		this.loadWalletDetail(id);
	}
}
