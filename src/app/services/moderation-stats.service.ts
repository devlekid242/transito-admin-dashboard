import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment.prod";
import { catchError, of, tap } from "rxjs";

// Date preset types
export interface DatePreset {
	id: string;
	label: string;
	startDate: string;
	endDate: string;
}

// Agency filter item
export interface AgencyFilterItem {
	id: number;
	name: string;
	city: string;
	status: string;
}

// KPI interfaces
export interface UserKpis {
	total: number;
	active: number;
	blocked: number;
	newThisWeek: number;
	newThisMonth: number;
	clients: number;
	agents: number;
	admins: number;
	avgReservationsPerUser: number;
	cancellationRate: number;
	usersByType: ChartDataItem[];
}

export interface AgencyKpis {
	total: number;
	active: number;
	suspended: number;
	kycVerified: number;
	kycPending: number;
	kycMissing: number;
	kycRejected: number;
	avgReservationsPerAgency: number;
	avgFillRate: number;
}

export interface ReservationKpis {
	total: number;
	fillRate: number;
	cancellationRate: number;
	reservationsByStatus: ChartDataItem[];
	monthlyReservations: number[];
}

export interface FinanceKpis {
	totalRevenue: number;
	totalTransactions: number;
	successfulPayments: number;
	pendingPayments: number;
	failedPayments: number;
	monthlyRevenue: number[];
}

export interface ChartDataItem {
	label: string;
	value: number;
	color: string;
}

export interface ChartSeries {
	name: string;
	data: number[];
	color: string;
	fill?: string;
	dotClass?: string;
}

export interface ChartData {
	labels: string[];
	series: ChartSeries[];
}

// Agency comparison interface
export interface AgencyComparison {
	agencyId: number;
	agencyName: string;
	status: string;
	kycStatus: string;
	totalReservations: number;
	totalRevenue: number;
	fillRate: number;
	cancellationRate: number;
	avgRating: number;
}

// Leaderboard interface
export interface LeaderboardItem {
	agencyId: number;
	agencyName: string;
	status: string;
	kycStatus: string;
	totalReservations: number;
	totalRevenue: number;
	fillRate: number;
	cancellationRate: number;
	avgRating: number;
}

// Complete moderation stats interface
export interface ModerationStats {
	users: UserKpis;
	agencies: AgencyKpis;
	reservations: ReservationKpis;
	finance: FinanceKpis;
	comparison: AgencyComparison[];
}

// Filter state interface
export interface FilterState {
	datePreset: string;
	customStartDate: string;
	customEndDate: string;
	selectedAgencyIds: number[];
	period: string; // 'daily', 'weekly', 'monthly'
}

// API Response Interface
export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
	timestamp?: string;
}

@Injectable({
	providedIn: "root",
})
export class ModerationStatsService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signal state for reactive management
	readonly moderationStats = signal<ModerationStats | null>(null);
	readonly datePresets = signal<DatePreset[]>([]);
	readonly agencies = signal<AgencyFilterItem[]>([]);
	readonly chartData = signal<{ [key: string]: ChartData }>({});
	readonly comparisonData = signal<{
		topByReservations: AgencyComparison[];
		topByRevenue: AgencyComparison[];
		topByFillRate: AgencyComparison[];
		topByLowestCancellation: AgencyComparison[];
	} | null>(null);

	// Loading states
	readonly loadingStats = signal<boolean>(false);
	readonly loadingPresets = signal<boolean>(false);
	readonly loadingAgencies = signal<boolean>(false);
	readonly loadingCharts = signal<boolean>(false);
	readonly loadingComparison = signal<boolean>(false);

	// Filter state
	readonly datePreset = signal<string>("last30");
	readonly customStartDate = signal<string>("");
	readonly customEndDate = signal<string>("");
	readonly selectedAgencyIds = signal<number[]>([]);
	readonly period = signal<string>("monthly");

	// Computed signals
	readonly userStats = computed(() => this.moderationStats()?.users ?? null);
	readonly agencyStats = computed(
		() => this.moderationStats()?.agencies ?? null,
	);
	readonly reservationStats = computed(
		() => this.moderationStats()?.reservations ?? null,
	);
	readonly financeStats = computed(
		() => this.moderationStats()?.finance ?? null,
	);
	readonly agencyComparison = computed(
		() => this.moderationStats()?.comparison ?? [],
	);

	// Selected date range
	readonly selectedDateRange = computed(() => {
		const preset = this.datePreset();
		const customStart = this.customStartDate();
		const customEnd = this.customEndDate();

		if (preset === "custom" && customStart && customEnd) {
			return { startDate: customStart, endDate: customEnd };
		}

		const presets = this.datePresets();
		const selectedPreset = presets.find((p) => p.id === preset);

		if (selectedPreset) {
			return {
				startDate: selectedPreset.startDate,
				endDate: selectedPreset.endDate,
			};
		}

		// Default to last 30 days
		return {
			startDate: this.formatDate(
				new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			),
			endDate: this.formatDate(new Date()),
		};
	});

	/**
	 * Load all moderation statistics.
	 */
	loadStats() {
		this.loadingStats.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate);

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<ModerationStats>
			>(`${this.apiBaseUrl}/admin/moderation/stats`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.moderationStats.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error loading moderation stats:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des statistiques",
					});
				}),
				tap(() => this.loadingStats.set(false)),
			);
	}

	/**
	 * Load date presets for filtering.
	 */
	loadDatePresets() {
		this.loadingPresets.set(true);

		return this.http
			.get<
				ApiResponse<DatePreset[]>
			>(`${this.apiBaseUrl}/admin/moderation/date-presets`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.datePresets.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error loading date presets:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des préréglages de date",
					});
				}),
				tap(() => this.loadingPresets.set(false)),
			);
	}

	/**
	 * Load agencies for filtering.
	 */
	loadAgencies() {
		this.loadingAgencies.set(true);

		return this.http
			.get<
				ApiResponse<AgencyFilterItem[]>
			>(`${this.apiBaseUrl}/admin/moderation/agencies`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.agencies.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error loading agencies:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des agences",
					});
				}),
				tap(() => this.loadingAgencies.set(false)),
			);
	}

	/**
	 * Load chart data for a specific chart type.
	 */
	loadChartData(chartType: string) {
		this.loadingCharts.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();
		const period = this.period();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate)
			.set("period", period);

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<ChartData>
			>(`${this.apiBaseUrl}/admin/moderation/charts/${chartType}`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const data = response.data;
						this.chartData.update((current) => ({
							...current,
							[chartType]: data,
						}));
					}
				}),
				catchError((error) => {
					console.error(
						`Error loading ${chartType} chart data:`,
						error,
					);
					return of({
						success: false,
						message:
							error.error?.message ||
							`Erreur lors du chargement du graphique ${chartType}`,
					});
				}),
				tap(() => this.loadingCharts.set(false)),
			);
	}

	/**
	 * Load all chart data at once.
	 */
	loadAllCharts() {
		this.loadingCharts.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();
		const period = this.period();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate)
			.set("period", period);

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<{
					users: ChartData;
					reservations: ChartData;
					revenue: ChartData;
					reservationsByStatus: ChartDataItem[];
					usersByType: ChartDataItem[];
				}>
			>(`${this.apiBaseUrl}/admin/moderation/charts/combined`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const data = response.data;
						this.chartData.set({
							users: data.users,
							reservations: data.reservations,
							revenue: data.revenue,
						});

						// Update stats with chart-specific data
						this.moderationStats.update((current) => {
							if (!current) return current;
							return {
								...current,
								reservations: {
									...current.reservations,
									reservationsByStatus:
										data.reservationsByStatus,
								},
								users: {
									...current.users,
									usersByType: data.usersByType,
								},
							};
						});
					}
				}),
				catchError((error) => {
					console.error("Error loading all charts:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des graphiques",
					});
				}),
				tap(() => this.loadingCharts.set(false)),
			);
	}

	/**
	 * Load agency comparison data.
	 */
	loadComparison(limit: number = 10) {
		this.loadingComparison.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate)
			.set("limit", limit.toString());

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<{
					topByReservations: AgencyComparison[];
					topByRevenue: AgencyComparison[];
					topByFillRate: AgencyComparison[];
					topByLowestCancellation: AgencyComparison[];
				}>
			>(`${this.apiBaseUrl}/admin/moderation/comparison`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.comparisonData.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error loading comparison data:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des comparaisons",
					});
				}),
				tap(() => this.loadingComparison.set(false)),
			);
	}

	/**
	 * Load leaderboard data by specific metric.
	 */
	loadLeaderboard(metric: string = "reservations", limit: number = 10) {
		this.loadingComparison.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate)
			.set("limit", limit.toString())
			.set("metric", metric);

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<{ data: AgencyComparison[]; metric: string }>
			>(`${this.apiBaseUrl}/admin/moderation/leaderboard`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const data = response.data;
						// Update the specific leaderboard in comparison data
						this.comparisonData.update((current) => {
							if (!current) return current;
							return {
								...current,
								[data.metric]: data.data,
							};
						});
					}
				}),
				catchError((error) => {
					console.error(
						`Error loading leaderboard by ${metric}:`,
						error,
					);
					return of({
						success: false,
						message:
							error.error?.message ||
							`Erreur lors du chargement du classement par ${metric}`,
					});
				}),
				tap(() => this.loadingComparison.set(false)),
			);
	}

	/**
	 * Load KPI summary.
	 */
	loadKpis() {
		this.loadingStats.set(true);

		const range = this.selectedDateRange();
		const agencyIds = this.selectedAgencyIds();

		let params = new HttpParams()
			.set("start_date", range.startDate)
			.set("end_date", range.endDate);

		if (agencyIds && agencyIds.length > 0) {
			agencyIds.forEach((id) => {
				params = params.append("agency_ids[]", id.toString());
			});
		}

		return this.http
			.get<
				ApiResponse<{
					users: Partial<UserKpis>;
					agencies: Partial<AgencyKpis>;
					reservations: Partial<ReservationKpis>;
					finance: Partial<FinanceKpis>;
				}>
			>(`${this.apiBaseUrl}/admin/moderation/kpis`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const data = response.data;
						// Update KPIs in the stats
						this.moderationStats.update((current) => {
							if (!current) return current;
							return {
								...current,
								users: { ...current.users, ...data.users },
								agencies: {
									...current.agencies,
									...data.agencies,
								},
								reservations: {
									...current.reservations,
									...data.reservations,
								},
								finance: {
									...current.finance,
									...data.finance,
								},
							};
						});
					}
				}),
				catchError((error) => {
					console.error("Error loading KPIs:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du chargement des KPI",
					});
				}),
				tap(() => this.loadingStats.set(false)),
			);
	}

	/**
	 * Refresh all data.
	 */
	refreshAll() {
		return this.loadStats();
	}

	/**
	 * Set date preset.
	 */
	setDatePreset(presetId: string) {
		this.datePreset.set(presetId);
		this.customStartDate.set("");
		this.customEndDate.set("");
	}

	/**
	 * Set custom date range.
	 */
	setCustomDateRange(startDate: string, endDate: string) {
		this.datePreset.set("custom");
		this.customStartDate.set(startDate);
		this.customEndDate.set(endDate);
	}

	/**
	 * Set selected agency IDs.
	 */
	setSelectedAgencyIds(agencyIds: number[]) {
		this.selectedAgencyIds.set(agencyIds);
	}

	/**
	 * Set period for charts.
	 */
	setPeriod(period: string) {
		this.period.set(period);
	}

	/**
	 * Reset all filters.
	 */
	resetFilters() {
		this.datePreset.set("last30");
		this.customStartDate.set("");
		this.customEndDate.set("");
		this.selectedAgencyIds.set([]);
		this.period.set("monthly");
	}

	/**
	 * Format date to YYYY-MM-DD.
	 */
	formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	/**
	 * Format currency to FCFA.
	 */
	formatCurrency(amount: number): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "XOF",
			currencyDisplay: "narrowSymbol",
		}).format(amount);
	}

	/**
	 * Format number with spaces.
	 */
	formatNumber(amount: number): string {
		return amount.toLocaleString("fr-FR");
	}

	/**
	 * Format percentage.
	 */
	formatPercentage(value: number, decimals: number = 2): string {
		return value.toFixed(decimals) + "%";
	}

	/**
	 * Get status label for display.
	 */
	getStatusLabel(status: string): string {
		switch (status) {
			case "active":
				return "Actif";
			case "blocked":
				return "Bloqué";
			case "suspended":
				return "Suspendu";
			case "pending":
				return "En attente";
			case "verified":
				return "Vérifié";
			case "missing":
				return "Manquant";
			case "rejected":
				return "Rejeté";
			default:
				return status;
		}
	}

	/**
	 * Get KYC status label.
	 */
	getKycStatusLabel(status: string): string {
		switch (status) {
			case "VERIFIED":
				return "Vérifié";
			case "PENDING":
				return "En attente";
			case "MISSING":
				return "Manquant";
			case "REJECTED":
				return "Rejeté";
			default:
				return status;
		}
	}

	/**
	 * Get status badge variant for styling.
	 */
	getStatusBadgeVariant(
		status: string,
	): "approved" | "pending" | "rejected" | "missing" {
		switch (status) {
			case "active":
			case "VERIFIED":
				return "approved";
			case "pending":
			case "PENDING":
				return "pending";
			case "blocked":
			case "suspended":
			case "REJECTED":
				return "rejected";
			case "MISSING":
				return "missing";
			default:
				return "pending";
		}
	}

	/**
	 * Get agency status badge variant.
	 */
	getAgencyStatusBadgeVariant(
		status: string,
	): "approved" | "pending" | "rejected" {
		switch (status) {
			case "active":
				return "approved";
			case "suspended":
			case "inactive":
				return "rejected";
			default:
				return "pending";
		}
	}

	/**
	 * Get chart color for index.
	 */
	getChartColor(index: number): string {
		const colors = [
			"#2563eb", // blue-600
			"#16a34a", // green-600
			"#8b5cf6", // violet-600
			"#f59e0b", // amber-600
			"#ef4444", // red-600
			"#06b6d4", // cyan-600
			"#ea580c", // orange-600
			"#7c3aed", // purple-600
		];
		return colors[index % colors.length];
	}
}
