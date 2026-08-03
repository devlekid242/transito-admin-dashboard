import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FinancialService, PeriodType } from "../../services/financial.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { StatCardComponent } from "../../shared/stat-card.component";
import { LineChartComponent } from "../../shared/line-chart.component";
import { BarChartComponent } from "../../shared/bar-chart.component";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-financial-stats",
	imports: [
		CommonModule,
		FormsModule,
		PageHeaderComponent,
		StatCardComponent,
		LineChartComponent,
		BarChartComponent,
	],
	templateUrl: "financial-stats.page.html",
})
export class FinancialStatsPage {
	readonly financialService = inject(FinancialService);

	readonly periods = [
		{ value: "daily" as const, label: "Jour" },
		{ value: "weekly" as const, label: "Semaine" },
		{ value: "monthly" as const, label: "Mois" },
	];

	// Use the service's date filter state directly
	readonly dateFilter = this.financialService.dateFilter;

	constructor() {
		this.loadData();
	}

	// Computed properties
	readonly data = computed(() => this.financialService.financialStats());
	readonly loading = computed(() =>
		this.financialService.loadingFinancialStats(),
	);
	readonly error = computed(() =>
		this.financialService.errorFinancialStats(),
	);

	fcfa(n: number) {
		return this.financialService.fcfa(n);
	}
	str(n: number) {
		return String(n);
	}
	round(n: number) {
		return Math.round(n);
	}
	formatPercentage(n: number) {
		return this.financialService.formatPercentage(n);
	}

	// KPI computations
	grossMerchandiseValue() {
		const data = this.data();
		return data?.kpis?.grossMerchandiseValue ?? 0;
	}

	totalWalletBalance() {
		const data = this.data();
		return data?.kpis?.totalWalletBalance ?? 0;
	}

	availableBalance() {
		const data = this.data();
		return data?.kpis?.availableBalance ?? 0;
	}

	platformBalance() {
		const data = this.data();
		return data?.kpis?.platformBalance ?? 0;
	}

	totalRefunds() {
		const data = this.data();
		return data?.kpis?.totalRefunds ?? 0;
	}

	pendingRefunds() {
		const data = this.data();
		return data?.kpis?.pendingRefunds ?? 0;
	}

	transactionVolume() {
		const data = this.data();
		return data?.kpis?.transactionVolume ?? 0;
	}

	gmvGrowthRate() {
		const data = this.data();
		return data?.kpis?.gmvGrowthRate ?? 0;
	}

	netMargin() {
		const data = this.data();
		return data?.kpis?.netMargin ?? 0;
	}

	averageBasket() {
		const data = this.data();
		return data?.kpis?.averageBasket ?? 0;
	}

	// Chart data
	readonly caChartSeries = computed(() => {
		const data = this.data();
		if (!data) return [];

		return [
			{
				name: "CA (M FCFA)",
				data: data.chartData.caSeries,
				color: "#2563eb",
				fill: "#2563eb",
				dotClass: "bg-green-600",
			},
		];
	});

	readonly caChartLabels = computed(
		() => this.data()?.chartData.labels ?? [],
	);

	readonly benefitVsCommissionsSeries = computed(() => {
		const data = this.data();
		if (!data) return [];

		return [
			{
				name: "Bénéfice",
				data: data.chartData.beneficeSeries,
				color: "#16a34a",
				dotClass: "bg-green-600",
			},
			{
				name: "Commissions",
				data: data.chartData.commissionsSeries,
				color: "#9333ea",
				dotClass: "bg-violet-600",
			},
		];
	});

	readonly benefitVsCommissionsLabels = computed(
		() => this.data()?.chartData.labels ?? [],
	);

	readonly agencyBarData = computed(() => {
		const data = this.data();
		if (!data) return [];

		return data.revenueByAgency.map((a) => ({
			label: a.agency.split(" ")[0],
			value: a.revenue,
			color: a.color,
		}));
	});

	readonly financialDetailByAgency = computed(
		() => this.data()?.financialDetailByAgency ?? [],
	);

	readonly walletBalances = computed(
		() =>
			this.data()?.walletBalances ?? {
				total: 0,
				available: 0,
				reserved: 0,
			},
	);

	readonly withdrawals = computed(
		() =>
			this.data()?.withdrawals ?? {
				totalCount: 0,
				totalAmount: 0,
				pendingCount: 0,
				pendingAmount: 0,
			},
	);

	readonly refunds = computed(
		() =>
			this.data()?.refunds ?? {
				totalCount: 0,
				totalAmount: 0,
				pendingCount: 0,
				pendingAmount: 0,
			},
	);

	// Load data
	loadData() {
		this.financialService.loadFinancialStats(this.dateFilter());
	}

	// Period change handler
	onPeriodChange(period: PeriodType) {
		this.financialService.updatePeriod(period);
		this.loadData();
	}

	// Custom date range handlers
	onStartDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		this.financialService.updateDateRange(
			input.value,
			this.dateFilter().endDate ?? "",
		);
	}

	onEndDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		this.financialService.updateDateRange(
			this.dateFilter().startDate ?? "",
			input.value,
		);
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
	getGMVTrend(): string {
		const rate = this.gmvGrowthRate();
		if (rate > 0) return `+${this.formatPercentage(rate)}`;
		if (rate < 0) return `${this.formatPercentage(rate)}`;
		return "Stable";
	}

	getPlatformBalanceTrend(): string {
		// For now, use same growth rate as GMV
		const rate = this.gmvGrowthRate() * 0.8;
		if (rate > 0) return `+${this.formatPercentage(rate)}`;
		if (rate < 0) return `${this.formatPercentage(rate)}`;
		return "Stable";
	}

	getWalletBalanceTrend(): string {
		// For now, use same growth rate as GMV
		const rate = this.gmvGrowthRate();
		if (rate > 0) return `+${this.formatPercentage(rate)}`;
		if (rate < 0) return `${this.formatPercentage(rate)}`;
		return "Stable";
	}
}
