import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
	ReportsService,
	DATE_RANGE_OPTIONS,
	DateRangeType,
	PlatformKpis,
	FinancialSummary,
	RevenueByPeriod,
	UserActivity,
	AgencyPerformance,
	RoutePerformance,
	PaymentDistribution,
	ReservationStatusDistribution,
} from "../../services/reports.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { StatCardComponent } from "../../shared/stat-card.component";
import { LineChartComponent } from "../../shared/line-chart.component";
import { BarChartComponent } from "../../shared/bar-chart.component";
import { DonutChartComponent } from "../../shared/donut-chart.component";

@Component({
	selector: "app-reports",
	imports: [
		CommonModule,
		FormsModule,
		PageHeaderComponent,
		StatCardComponent,
		LineChartComponent,
		BarChartComponent,
		DonutChartComponent,
	],
	templateUrl: "reports.page.html",
})
export class ReportsPage {
	readonly reportsService = inject(ReportsService);

	// Date range state
	readonly dateRangeOptions = DATE_RANGE_OPTIONS;
	selectedRangeType = signal<DateRangeType>("TODAY");
	customStartDate = signal<string>("");
	customEndDate = signal<string>("");
	showCustomDatePicker = signal<boolean>(false);

	// Export state
	exported = signal(false);
	exporting = signal(false);

	// Loading and error states
	loading = signal(false);
	error = signal<string | null>(null);

	// Modal state for date picker
	showDateRangeModal = signal(false);

	constructor() {
		// Load initial reports data
		this.loadInitialData();

		// Effect to update loading state based on service
		effect(() => {
			const serviceLoading = this.reportsService.loading();
			this.loading.set(serviceLoading);

			const serviceError = this.reportsService.error();
			if (serviceError) {
				this.error.set(serviceError);
			}
		});
	}

	// Load initial data
	private loadInitialData() {
		this.loading.set(true);
		this.error.set(null);
		this.reportsService.loadReportsByType("TODAY");
	}

	// Get data from service
	reportsData = computed(() => this.reportsService.reportsData());

	// Safe accessors for template
	kpis = computed(() => this.reportsData()?.kpis ?? null);
	financialSummary = computed(
		() => this.reportsData()?.financialSummary ?? null,
	);

	// Chart data generators
	private createRevenueChartData() {
		return {
			labels: ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil"],
			datasets: [
				{
					label: "Revenu total",
					data: [8500, 9200, 10500, 11200, 11800, 12500, 12580],
					color: "#2563eb",
					fill: "rgba(37, 99, 235, 0.1)",
					type: "line" as const,
				},
				{
					label: "Revenu net",
					data: [6800, 7360, 8400, 8960, 9440, 10000, 10064],
					color: "#16a34a",
					fill: "rgba(22, 163, 74, 0.1)",
					type: "line" as const,
				},
			],
		};
	}

	private createReservationsChartData() {
		return {
			labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
			datasets: [
				{
					label: "Réservations",
					data: [520, 580, 640, 710, 750, 620, 580],
					color: "#2563eb",
					fill: "rgba(37, 99, 235, 0.1)",
					type: "bar" as const,
				},
			],
		};
	}

	private createUserGrowthChartData() {
		return {
			labels: ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil"],
			datasets: [
				{
					label: "Nouveaux utilisateurs",
					data: [850, 920, 1050, 1200, 1350, 1480, 1542],
					color: "#16a34a",
					fill: "rgba(22, 163, 74, 0.1)",
					type: "line" as const,
				},
			],
		};
	}

	private createAgencyPerformanceChartData() {
		const data = this.reportsData();
		return {
			labels: data?.agencyPerformance.map((a) => a.agencyName) ?? [],
			datasets: [
				{
					label: "Revenu par agence",
					data: data?.agencyPerformance.map((a) => a.revenue) ?? [],
					color: "#2563eb",
					fill: "rgba(37, 99, 235, 0.1)",
					type: "bar" as const,
				},
			],
		};
	}

	// Format functions
	fcfa(n: number) {
		return this.reportsService.fcfa(n);
	}
	str(n: number) {
		return String(n);
	}
	formatNumber(n: number) {
		return this.reportsService.formatNumber(n);
	}
	formatPercentage(n: number, decimals: number = 1) {
		return this.reportsService.formatPercentage(n, decimals);
	}

	// Date range handling
	setDateRangeType(rangeType: DateRangeType) {
		this.selectedRangeType.set(rangeType);
		this.showCustomDatePicker.set(false);
		this.reportsService.setDateRangeType(rangeType);
	}

	// Getter for selected range type to use in template binding
	getSelectedRangeType(): DateRangeType {
		return this.selectedRangeType();
	}

	// Setter for selected range type to use in template binding
	onRangeTypeChange(rangeType: DateRangeType): void {
		this.setDateRangeType(rangeType);
	}

	toggleCustomDatePicker() {
		const currentType = this.selectedRangeType();
		if (currentType === "CUSTOM") {
			this.showCustomDatePicker.set(!this.showCustomDatePicker());
		} else {
			this.selectedRangeType.set("CUSTOM");
			this.showCustomDatePicker.set(true);
		}
	}

	applyCustomDateRange() {
		const startDate = this.customStartDate();
		const endDate = this.customEndDate();

		if (startDate && endDate) {
			this.reportsService.setCustomDateRange(startDate, endDate);
			this.showCustomDatePicker.set(false);
		}
	}

	// Get date range label for display
	getDateRangeLabel(): string {
		return this.reportsService.getDateRangeLabel();
	}

	// Export functions
	exportCsv() {
		this.exporting.set(true);
		this.reportsService.exportToCSV();

		// Show success message
		this.exported.set(true);
		setTimeout(() => {
			this.exported.set(false);
			this.exporting.set(false);
		}, 2500);
	}

	exportPdf() {
		this.exporting.set(true);
		this.reportsService.exportToPDF();

		// Show success message
		this.exported.set(true);
		setTimeout(() => {
			this.exported.set(false);
			this.exporting.set(false);
		}, 2500);
	}

	// Helper methods for template
	getGrowthColor(rate: number): string {
		return this.reportsService.getGrowthColor(rate);
	}

	getGrowthIcon(rate: number): string {
		return this.reportsService.getGrowthIcon(rate);
	}

	// Agency performance table data
	agencyPerformanceData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.agencyPerformance.map((agency) => ({
			agency: agency.agencyName,
			revenue: agency.revenue,
			reservations: agency.reservations,
			fillRate: agency.fillRate,
			cancellationRate: agency.cancellationRate,
			rating: agency.rating,
			status: agency.status,
		}));
	}

	// Route performance table data
	routePerformanceData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.routePerformance.map((route) => ({
			route: route.route,
			revenue: route.revenue,
			bookings: route.bookings,
			fillRate: route.fillRate,
			averagePrice: route.averagePrice,
		}));
	}

	// Payment distribution chart data
	paymentDistributionData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.paymentDistribution.map((payment) => ({
			label: payment.method,
			value: payment.amount,
			percentage: payment.percentage,
			color: this.getPaymentMethodColor(payment.method),
		}));
	}

	// Reservation status distribution chart data
	reservationStatusData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.reservationStatusDistribution.map((status) => ({
			label: this.getStatusLabel(status.status),
			value: status.count,
			percentage: status.percentage,
			color: this.getStatusColor(status.status),
		}));
	}

	// Helper methods for colors
	private getPaymentMethodColor(method: string): string {
		const colors: Record<string, string> = {
			"Mobile Money": "#16a34a",
			"Carte Bancaire": "#2563eb",
			Espèces: "#ef4444",
		};
		return colors[method] || "#6b7280";
	}

	private getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			CONFIRMED: "Confirmé",
			COMPLETED: "Terminé",
			CANCELLED: "Annulé",
			PENDING: "En attente",
		};
		return labels[status] || status;
	}

	private getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			CONFIRMED: "#16a34a",
			COMPLETED: "#2563eb",
			CANCELLED: "#ef4444",
			PENDING: "#f59e0b",
		};
		return colors[status] || "#6b7280";
	}

	// Get agency status badge class
	getAgencyStatusClass(status: string): string {
		switch (status) {
			case "ACTIVE":
				return "bg-green-50 text-green-700";
			case "SUSPENDED":
				return "bg-red-50 text-red-700";
			case "INACTIVE":
				return "bg-gray-50 text-gray-700";
			default:
				return "bg-gray-50 text-gray-700";
		}
	}

	// Get agency status label
	getAgencyStatusLabel(status: string): string {
		switch (status) {
			case "ACTIVE":
				return "Actif";
			case "SUSPENDED":
				return "Suspendu";
			case "INACTIVE":
				return "Inactif";
			default:
				return status;
		}
	}

	// Revenue by period for chart
	revenueByPeriodData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.revenueByPeriod.map((period) => ({
			label: period.period,
			value: period.revenue,
			reservations: period.reservations,
			growthRate: period.growthRate || 0,
		}));
	}

	// Line chart series for revenue
	revenueLineChartSeries() {
		const data = this.reportsData();
		if (!data) return [];

		return [
			{
				name: "Revenu total",
				data: data.revenueByPeriod.map((p) => p.revenue / 1000), // Scale down for better display
				color: "#2563eb",
				fill: "#2563eb",
				dotClass: "bg-green-600",
			},
			{
				name: "Revenu net",
				data: data.revenueByPeriod.map((p) => (p.revenue * 0.8) / 1000), // Approximate net revenue
				color: "#16a34a",
				fill: "#16a34a",
				dotClass: "bg-green-600",
			},
		];
	}

	// Agency bar chart data
	agencyBarData() {
		const data = this.reportsData();
		if (!data) return [];

		return data.agencyPerformance.map((agency) => ({
			label: agency.agencyName.split(" ")[0],
			value: agency.revenue,
			color: "#2563eb",
		}));
	}

	// User activity chart series
	userActivitySeries() {
		const data = this.reportsData();
		if (!data) return [];

		return [
			{
				name: "Nouveaux utilisateurs",
				data: data.userActivity.map((a) => a.newUsers),
				color: "#16a34a",
				fill: "#16a34a",
				dotClass: "bg-green-600",
			},
		];
	}

	// Reservations chart series
	reservationsSeries() {
		const data = this.reportsData();
		if (!data) return [];

		return [
			{
				name: "Réservations",
				data: data.userActivity.map((a) => a.reservations),
				color: "#2563eb",
				fill: "#2563eb",
				dotClass: "bg-blue-600",
			},
		];
	}

	// Labels for charts
	revenueLabels() {
		const data = this.reportsData();
		return data?.revenueByPeriod.map((p) => p.period) ?? [];
	}

	userActivityLabels() {
		const data = this.reportsData();
		return data?.userActivity.map((a) => a.date) ?? [];
	}

	// Refresh data
	refreshData() {
		this.loading.set(true);
		const currentRange = this.reportsService.dateRange();
		this.reportsService.loadReports(currentRange);
	}

	// Clear error
	clearError() {
		this.error.set(null);
		this.reportsService.error.set(null);
	}
}
