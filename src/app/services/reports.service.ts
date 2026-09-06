import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment.prod";
import { catchError, of } from "rxjs";

// Date range types
export type DateRangeType =
	| "TODAY"
	| "LAST_7_DAYS"
	| "LAST_30_DAYS"
	| "MTD"
	| "YTD"
	| "CUSTOM";

// Report date range interface
export interface ReportDateRange {
	startDate: string;
	endDate: string;
	type: DateRangeType;
}

// Platform KPIs interface
export interface PlatformKpis {
	// Financial metrics
	totalRevenue: number;
	grossTurnover: number;
	netRevenue: number;
	platformFees: number;

	// Operational metrics
	totalReservations: number;
	totalTrips: number;
	totalUsers: number;
	activeAgencies: number;
	totalAgencies: number;

	// Performance metrics
	fillRate: number;
	cancellationRate: number;
	completionRate: number;

	// Transaction metrics
	totalTransactions: number;
	totalWithdrawals: number;
	totalRefunds: number;

	// Growth metrics
	revenueGrowthRate: number;
	userGrowthRate: number;
	reservationGrowthRate: number;
}

// Revenue by period interface
export interface RevenueByPeriod {
	period: string;
	revenue: number;
	reservations: number;
	growthRate?: number;
}

// Financial summary interface
export interface FinancialSummary {
	totalBalance: number;
	availableBalance: number;
	reservedBalance: number;
	pendingWithdrawals: number;
	pendingRefunds: number;
	commissionEarnings: number;
}

// Agency performance interface
export interface AgencyPerformance {
	agencyId: string;
	agencyName: string;
	revenue: number;
	reservations: number;
	fillRate: number;
	cancellationRate: number;
	rating: number;
	status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
}

// Route performance interface
export interface RoutePerformance {
	route: string;
	revenue: number;
	bookings: number;
	fillRate: number;
	averagePrice: number;
}

// User activity interface
export interface UserActivity {
	date: string;
	newUsers: number;
	activeUsers: number;
	reservations: number;
	totalRevenue: number;
}

// Payment method distribution
export interface PaymentDistribution {
	method: string;
	amount: number;
	count: number;
	percentage: number;
}

// Reservation status distribution
export interface ReservationStatusDistribution {
	status: string;
	count: number;
	percentage: number;
	amount: number;
}

// Chart data interfaces
export interface ChartData {
	labels: string[];
	datasets: ChartDataset[];
}

export interface ChartDataset {
	label: string;
	data: number[];
	color: string;
	fill?: string;
	type?: "line" | "bar";
}

// Comprehensive report data interface
export interface ReportsData {
	kpis: PlatformKpis;
	financialSummary: FinancialSummary;
	revenueByPeriod: RevenueByPeriod[];
	userActivity: UserActivity[];
	agencyPerformance: AgencyPerformance[];
	routePerformance: RoutePerformance[];
	paymentDistribution: PaymentDistribution[];
	reservationStatusDistribution: ReservationStatusDistribution[];

	// Chart data
	revenueChartData: ChartData;
	reservationsChartData: ChartData;
	userGrowthChartData: ChartData;
	agencyPerformanceChartData: ChartData;
}

// Date filter options
export const DATE_RANGE_OPTIONS: {
	value: DateRangeType;
	label: string;
	days?: number;
}[] = [
	{ value: "TODAY", label: "Aujourd'hui" },
	{ value: "LAST_7_DAYS", label: "7 derniers jours", days: 7 },
	{ value: "LAST_30_DAYS", label: "30 derniers jours", days: 30 },
	{ value: "MTD", label: "Mois en cours" },
	{ value: "YTD", label: "Année en cours" },
	{ value: "CUSTOM", label: "Plage personnalisée" },
];

@Injectable({
	providedIn: "root",
})
export class ReportsService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// State signals
	readonly reportsData = signal<ReportsData | null>(null);
	readonly dateRange = signal<ReportDateRange>({
		startDate: this.getStartOfDay(new Date()).toISOString().split("T")[0],
		endDate: this.getEndOfDay(new Date()).toISOString().split("T")[0],
		type: "TODAY",
	});

	readonly loading = signal<boolean>(false);
	readonly error = signal<string | null>(null);

	// Computed properties
	readonly kpis = computed(() => this.reportsData()?.kpis ?? null);
	readonly financialSummary = computed(
		() => this.reportsData()?.financialSummary ?? null,
	);
	readonly revenueByPeriod = computed(
		() => this.reportsData()?.revenueByPeriod ?? [],
	);
	readonly userActivity = computed(
		() => this.reportsData()?.userActivity ?? [],
	);
	readonly agencyPerformance = computed(
		() => this.reportsData()?.agencyPerformance ?? [],
	);
	readonly routePerformance = computed(
		() => this.reportsData()?.routePerformance ?? [],
	);
	readonly paymentDistribution = computed(
		() => this.reportsData()?.paymentDistribution ?? [],
	);
	readonly reservationStatusDistribution = computed(
		() => this.reportsData()?.reservationStatusDistribution ?? [],
	);

	readonly revenueChartData = computed(
		() => this.reportsData()?.revenueChartData ?? null,
	);
	readonly reservationsChartData = computed(
		() => this.reportsData()?.reservationsChartData ?? null,
	);
	readonly userGrowthChartData = computed(
		() => this.reportsData()?.userGrowthChartData ?? null,
	);
	readonly agencyPerformanceChartData = computed(
		() => this.reportsData()?.agencyPerformanceChartData ?? null,
	);

	/**
	 * Load comprehensive reports data with date filtering
	 */
	loadReports(dateRange?: ReportDateRange) {
		this.loading.set(true);
		this.error.set(null);

		// Use provided date range or current one
		const range = dateRange ?? this.dateRange();

		// Build HTTP params
		let params = new HttpParams()
			.set("startDate", range.startDate)
			.set("endDate", range.endDate)
			.set("type", range.type);

		this.http
			.get<{ success: boolean; data: ReportsData }>(
				`${this.apiBaseUrl}/admin/financial/reports/comprehensive`,
				{ params },
			)
			.pipe(
				catchError((error) => {
					this.error.set(
						"Échec du chargement des rapports. Veuillez réessayer.",
					);
					this.loading.set(false);
					return of(null);
				}),
			)
			.subscribe({
				next: (response) => {
					if (response?.success && response.data) {
						this.reportsData.set(response.data);
						// Update current date range if it was provided
						if (dateRange) {
							this.dateRange.set(range);
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
	 * Load reports for a specific date range type
	 */
	loadReportsByType(
		rangeType: DateRangeType,
		customStartDate?: string,
		customEndDate?: string,
	) {
		const dateRange = this.calculateDateRange(
			rangeType,
			customStartDate,
			customEndDate,
		);
		this.loadReports(dateRange);
	}

	/**
	 * Calculate date range based on type
	 */
	calculateDateRange(
		rangeType: DateRangeType,
		customStartDate?: string,
		customEndDate?: string,
	): ReportDateRange {
		const now = new Date();
		let startDate: Date;
		let endDate: Date;

		switch (rangeType) {
			case "TODAY":
				startDate = this.getStartOfDay(now);
				endDate = this.getEndOfDay(now);
				break;

			case "LAST_7_DAYS":
				startDate = new Date(now);
				startDate.setDate(startDate.getDate() - 6);
				startDate = this.getStartOfDay(startDate);
				endDate = this.getEndOfDay(now);
				break;

			case "LAST_30_DAYS":
				startDate = new Date(now);
				startDate.setDate(startDate.getDate() - 29);
				startDate = this.getStartOfDay(startDate);
				endDate = this.getEndOfDay(now);
				break;

			case "MTD":
				startDate = this.getStartOfMonth(now);
				endDate = this.getEndOfDay(now);
				break;

			case "YTD":
				startDate = this.getStartOfYear(now);
				endDate = this.getEndOfDay(now);
				break;

			case "CUSTOM":
				if (customStartDate && customEndDate) {
					startDate = new Date(customStartDate);
					endDate = new Date(customEndDate);
				} else {
					// Default to last 30 days if no custom dates provided
					startDate = new Date(now);
					startDate.setDate(startDate.getDate() - 29);
					startDate = this.getStartOfDay(startDate);
					endDate = this.getEndOfDay(now);
				}
				break;

			default:
				startDate = this.getStartOfDay(now);
				endDate = this.getEndOfDay(now);
		}

		return {
			startDate: this.formatDate(startDate),
			endDate: this.formatDate(endDate),
			type: rangeType,
		};
	}

	/**
	 * Set custom date range
	 */
	setCustomDateRange(startDate: string, endDate: string) {
		const dateRange: ReportDateRange = {
			startDate: this.formatDate(new Date(startDate)),
			endDate: this.formatDate(new Date(endDate)),
			type: "CUSTOM",
		};
		this.dateRange.set(dateRange);
		this.loadReports(dateRange);
	}

	/**
	 * Set date range type
	 */
	setDateRangeType(rangeType: DateRangeType) {
		const dateRange = this.calculateDateRange(rangeType);
		this.dateRange.set(dateRange);
		this.loadReports(dateRange);
	}

	/**
	 * Export reports as CSV
	 */
	exportToCSV() {
		const data = this.reportsData();
		if (!data) return;

		// Create CSV content
		let csvContent = "RAPPORT ANALYTIQUE PLATEFORME\n";
		csvContent += `Période: ${this.dateRange().startDate} à ${this.dateRange().endDate}\n\n`;

		// Add KPIs
		csvContent += "INDICATEURS CLÉS DE PERFORMANCE\n";
		csvContent += "Métrique,Valeur\n";
		csvContent += `Revenu total,${data.kpis.totalRevenue}\n`;
		csvContent += `Chiffre d'affaires brut,${data.kpis.grossTurnover}\n`;
		csvContent += `Revenu net,${data.kpis.netRevenue}\n`;
		csvContent += `Frais plateforme,${data.kpis.platformFees}\n`;
		csvContent += `Réservations totales,${data.kpis.totalReservations}\n`;
		csvContent += `Utilisateurs totaux,${data.kpis.totalUsers}\n`;
		csvContent += `Taux de remplissage,${data.kpis.fillRate}%\n`;
		csvContent += `Taux d'annulation,${data.kpis.cancellationRate}%\n`;
		csvContent += `Taux de complétion,${data.kpis.completionRate}%\n\n`;

		// Add financial summary
		csvContent += "RÉSUMÉ FINANCIER\n";
		csvContent += "Métrique,Valeur\n";
		csvContent += `Solde total,${data.financialSummary.totalBalance}\n`;
		csvContent += `Solde disponible,${data.financialSummary.availableBalance}\n`;
		csvContent += `Solde réservé,${data.financialSummary.reservedBalance}\n`;
		csvContent += `Retraits en attente,${data.financialSummary.pendingWithdrawals}\n`;
		csvContent += `Remboursements en attente,${data.financialSummary.pendingRefunds}\n`;
		csvContent += `Gains commissions,${data.financialSummary.commissionEarnings}\n\n`;

		// Add agency performance
		csvContent += "PERFORMANCE PAR AGENCE\n";
		csvContent +=
			"Agence,Revenu,Réservations,Taux remplissage,Taux annulation,Note,Statut\n";
		data.agencyPerformance.forEach((agency) => {
			csvContent += `${agency.agencyName},${agency.revenue},${agency.reservations},${agency.fillRate}%,${agency.cancellationRate}%,${agency.rating},${agency.status}\n`;
		});

		csvContent += "\nPERFORMANCE PAR TRAJET\n";
		csvContent +=
			"Trajet,Revenu,Réservations,Taux remplissage,Prix moyen\n";
		data.routePerformance.forEach((route) => {
			csvContent += `${route.route},${route.revenue},${route.bookings},${route.fillRate}%,${route.averagePrice}\n`;
		});

		// Create and download file
		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `rapport-analytique-${this.dateRange().startDate}-${this.dateRange().endDate}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	/**
	 * Export reports as PDF (basic implementation)
	 */
	exportToPDF() {
		// This would be enhanced with a proper PDF generation library
		// For now, we'll just trigger a print dialog with formatted content
		window.print();
	}

	/**
	 * Get report date range label for display
	 */
	getDateRangeLabel(): string {
		const range = this.dateRange();
		const options: Record<DateRangeType, string> = {
			TODAY: "Aujourd'hui",
			LAST_7_DAYS: "7 derniers jours",
			LAST_30_DAYS: "30 derniers jours",
			MTD: "Mois en cours",
			YTD: "Année en cours",
			CUSTOM: `${range.startDate} - ${range.endDate}`,
		};
		return options[range.type] || range.type;
	}

	/**
	 * Format currency value as FCFA
	 */
	fcfa(value: number): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "XAF",
			currencyDisplay: "narrowSymbol",
			minimumFractionDigits: 0,
		}).format(value);
	}

	/**
	 * Format number with spaces as thousand separator
	 */
	formatNumber(value: number): string {
		return new Intl.NumberFormat("fr-FR").format(value);
	}

	/**
	 * Format percentage
	 */
	formatPercentage(value: number, decimals: number = 2): string {
		return value.toFixed(decimals) + "%";
	}

	/**
	 * Calculate growth rate percentage
	 */
	calculateGrowthRate(current: number, previous: number): number {
		if (previous === 0) return 0;
		return ((current - previous) / previous) * 100;
	}

	/**
	 * Get start of day
	 */
	private getStartOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	/**
	 * Get end of day
	 */
	private getEndOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(23, 59, 59, 999);
		return d;
	}

	/**
	 * Get start of month
	 */
	private getStartOfMonth(date: Date): Date {
		const d = new Date(date);
		d.setDate(1);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	/**
	 * Get end of month
	 */
	private getEndOfMonth(date: Date): Date {
		const d = new Date(date);
		d.setMonth(d.getMonth() + 1);
		d.setDate(0);
		d.setHours(23, 59, 59, 999);
		return d;
	}

	/**
	 * Get start of year
	 */
	private getStartOfYear(date: Date): Date {
		const d = new Date(date);
		d.setMonth(0);
		d.setDate(1);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	/**
	 * Format date as YYYY-MM-DD
	 */
	private formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	/**
	 * Get color for growth rate (positive/negative)
	 */
	getGrowthColor(rate: number): string {
		if (rate > 0) return "text-green-600";
		if (rate < 0) return "text-red-600";
		return "text-gray-600";
	}

	/**
	 * Get icon for growth rate
	 */
	getGrowthIcon(rate: number): string {
		if (rate > 0) return "fa-arrow-trend-up";
		if (rate < 0) return "fa-arrow-trend-down";
		return "fa-minus";
	}
}
