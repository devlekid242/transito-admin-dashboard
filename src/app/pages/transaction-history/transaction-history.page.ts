import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
	FinancialService,
	Transaction,
	TransactionType,
	TransactionStatus,
	TransactionFilter,
} from "../../services/financial.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { StatCardComponent } from "../../shared/stat-card.component";
import { StatusBadgeComponent } from "../../shared/status-badge.component";
import { ModalComponent } from "../../shared/modal.component";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-transaction-history",
	imports: [
		CommonModule,
		FormsModule,
		PageHeaderComponent,
		StatCardComponent,
		StatusBadgeComponent,
		ModalComponent,
	],
	templateUrl: "transaction-history.page.html",
})
export class TransactionHistoryPage {
	readonly financialService = inject(FinancialService);

	// Search, filter and sorting state
	readonly search = signal("");
	readonly type = signal<"ALL" | TransactionType>("ALL");
	readonly status = signal<"ALL" | TransactionStatus>("ALL");
	readonly sortBy = signal<"date" | "amount" | "feeAmount">("date");
	readonly sortOrder = signal<"asc" | "desc">("desc");
	readonly perPage = signal<number>(50);
	readonly currentPage = signal<number>(1);

	// Modal state
	readonly showDetailModal = signal(false);
	readonly selectedTransaction = signal<Transaction | null>(null);
	readonly copiedField = signal<string | null>(null);

	// Computed properties
	readonly transactions = computed(() => {
		return this.financialService.transactionHistory()?.transactions ?? [];
	});

	readonly transactionStats = computed(() => {
		return this.financialService.transactionHistory()?.stats ?? null;
	});

	readonly pagination = computed(() => {
		return this.financialService.transactionPagination();
	});

	readonly isLoading = computed(() => {
		return this.financialService.loadingTransactionHistory();
	});

	readonly error = computed(() => {
		return this.financialService.errorTransactionHistory();
	});

	constructor() {
		// Reload when search, filters, pagination, sort, or global date filter / refresh trigger change
		effect(() => {
			const s = this.search();
			const t = this.type();
			const st = this.status();
			const sb = this.sortBy();
			const so = this.sortOrder();
			const pp = this.perPage();
			const cp = this.currentPage();
			const df = this.financialService.dateFilter();
			const rt = this.financialService.refreshTrigger();

			// Debounce search/filter updates
			const timer = setTimeout(() => {
				this.loadData();
			}, 300);

			return () => clearTimeout(timer);
		});
	}

	loadData(pageNumber?: number) {
		const page = pageNumber ?? this.currentPage();
		const dateFilter = this.financialService.dateFilter();

		const filter: TransactionFilter = {
			search: this.search().trim() || undefined,
			type: this.type() === "ALL" ? undefined : this.type(),
			status: this.status() === "ALL" ? undefined : this.status(),
			startDate: dateFilter.startDate || undefined,
			endDate: dateFilter.endDate || undefined,
			page,
			perPage: this.perPage(),
			sortBy: this.sortBy(),
			sortOrder: this.sortOrder(),
		};

		this.financialService.loadTransactionHistory(filter);
	}

	onTypeChange(value: string) {
		this.type.set(value as "ALL" | TransactionType);
		this.currentPage.set(1);
	}

	onStatusChange(value: string) {
		this.status.set(value as "ALL" | TransactionStatus);
		this.currentPage.set(1);
	}

	onPerPageChange(value: string | number) {
		this.perPage.set(Number(value));
		this.currentPage.set(1);
	}

	onSortSelect(value: string) {
		const [field, order] = value.split("-") as [
			"date" | "amount" | "feeAmount",
			"asc" | "desc",
		];
		this.sortBy.set(field || "date");
		this.sortOrder.set(order || "desc");
		this.currentPage.set(1);
	}

	toggleSort(field: "date" | "amount" | "feeAmount") {
		if (this.sortBy() === field) {
			this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
		} else {
			this.sortBy.set(field);
			this.sortOrder.set("desc");
		}
		this.currentPage.set(1);
	}

	resetFilters() {
		this.search.set("");
		this.type.set("ALL");
		this.status.set("ALL");
		this.sortBy.set("date");
		this.sortOrder.set("desc");
		this.currentPage.set(1);
	}

	getTypeLabel(type: TransactionType): string {
		return this.financialService.getTransactionTypeLabel(type);
	}

	getStatusLabel(status: TransactionStatus): string {
		return this.financialService.getTransactionStatusLabel(status);
	}

	getTypeIcon(type: TransactionType): string {
		return this.financialService.getTransactionTypeIcon(type);
	}

	getStatusVariant(
		status: TransactionStatus,
	): "pending" | "approved" | "rejected" {
		switch (status) {
			case "SUCCESS":
				return "approved";
			case "PENDING":
				return "pending";
			case "FAILED":
				return "rejected";
			default:
				return "pending";
		}
	}

	getStatusIcon(status: TransactionStatus): string {
		switch (status) {
			case "SUCCESS":
				return "fa-check";
			case "PENDING":
				return "fa-hourglass-half";
			case "FAILED":
				return "fa-xmark";
			default:
				return "fa-question";
		}
	}

	getTypeColor(type: TransactionType): string {
		switch (type) {
			case "PAYMENT":
				return "bg-green-50 text-green-700";
			case "WITHDRAWAL":
				return "bg-amber-50 text-amber-700";
			case "REFUND":
				return "bg-red-50 text-red-700";
			case "COMMISSION":
				return "bg-violet-50 text-violet-700";
			case "TOPUP":
				return "bg-cyan-50 text-cyan-700";
			case "ADJUSTMENT":
				return "bg-orange-50 text-orange-700";
			case "SYSTEM":
				return "bg-gray-50 text-gray-700";
			default:
				return "bg-gray-50 text-gray-700";
		}
	}

	getAmountColor(amount: number): string {
		return amount > 0 ? "text-green-600" : "text-red-600";
	}

	fcfa(value: number): string {
		return this.financialService.fcfa(value);
	}

	formatNumber(value: number): string {
		return this.financialService.formatNumber(value);
	}

	// --- Modale de détail : aides d'affichage --------------------------

	copyToClipboard(value: string | number | null | undefined, field: string) {
		if (value === null || value === undefined) return;
		navigator.clipboard?.writeText(String(value)).then(() => {
			this.copiedField.set(field);
			setTimeout(() => {
				if (this.copiedField() === field) this.copiedField.set(null);
			}, 1500);
		});
	}

	formatDateTime(iso?: string | null): string {
		if (!iso) return "—";
		const d = new Date(iso);
		if (isNaN(d.getTime())) return "—";
		const date = d.toLocaleDateString("fr-FR");
		const time = d.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
		return `${date} à ${time}`;
	}

	getDurationLabel(
		initiatedAt?: string | null,
		validatedAt?: string | null,
	): string {
		if (!initiatedAt) return "—";
		const start = new Date(initiatedAt).getTime();
		if (isNaN(start)) return "—";
		const end = validatedAt ? new Date(validatedAt).getTime() : Date.now();
		const diffMs = Math.max(0, end - start);

		const minutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		let duration: string;
		if (days > 0) duration = `${days} j ${hours % 24} h`;
		else if (hours > 0) duration = `${hours} h ${minutes % 60} min`;
		else duration = `${minutes} min`;

		return validatedAt
			? `Traité en ${duration}`
			: `En attente depuis ${duration}`;
	}

	getSubStatusMeta(raw?: string | null): {
		variant: "pending" | "approved" | "rejected";
		label: string;
		icon: string;
	} {
		const value = (raw ?? "").toUpperCase();

		const table: Record<
			string,
			{
				variant: "pending" | "approved" | "rejected";
				label: string;
				icon: string;
			}
		> = {
			PENDING: {
				variant: "pending",
				label: "En attente",
				icon: "fa-hourglass-half",
			},
			REFUND_PENDING: {
				variant: "pending",
				label: "Remboursement en attente",
				icon: "fa-hourglass-half",
			},
			SUCCESS: { variant: "approved", label: "Réussi", icon: "fa-check" },
			APPROVED: {
				variant: "approved",
				label: "Approuvé",
				icon: "fa-check",
			},
			COMPLETED: {
				variant: "approved",
				label: "Terminé",
				icon: "fa-check-double",
			},
			REFUNDED: {
				variant: "approved",
				label: "Remboursé",
				icon: "fa-rotate-left",
			},
			REFUNDED_COMPLETED: {
				variant: "approved",
				label: "Remboursé",
				icon: "fa-rotate-left",
			},
			REFUNDED_FORCE: {
				variant: "approved",
				label: "Remboursé (forcé)",
				icon: "fa-triangle-exclamation",
			},
			FAILED: { variant: "rejected", label: "Échec", icon: "fa-xmark" },
			REJECTED: {
				variant: "rejected",
				label: "Rejeté",
				icon: "fa-xmark",
			},
		};

		return (
			table[value] ?? {
				variant: "pending",
				label: raw || "—",
				icon: "fa-question",
			}
		);
	}

	// Modal functions
	openDetailModal(transaction: Transaction) {
		this.selectedTransaction.set(transaction);
		this.showDetailModal.set(true);
	}

	closeDetailModal() {
		this.showDetailModal.set(false);
		this.selectedTransaction.set(null);
	}

	// Pagination functions
	goToPage(page: number) {
		const pagination = this.pagination();
		if (!pagination) return;
		if (page >= 1 && page <= pagination.total_pages) {
			this.currentPage.set(page);
		}
	}

	get pages(): number[] {
		const pagination = this.pagination();
		if (!pagination) return [];

		const pages: number[] = [];
		const totalPages = pagination.total_pages;

		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			const current = pagination.current_page;
			const start = Math.max(1, current - 2);
			const end = Math.min(totalPages, current + 2);

			if (start > 1) {
				pages.push(1);
				if (start > 2) pages.push(-1); // ellipsis
			}

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (end < totalPages) {
				if (end < totalPages - 1) pages.push(-1); // ellipsis
				pages.push(totalPages);
			}
		}

		return pages;
	}

	getShowingRange(): string {
		const pagination = this.pagination();
		if (!pagination || pagination.total === 0) return "0 transaction";
		const start = (pagination.current_page - 1) * pagination.per_page + 1;
		const end = Math.min(
			pagination.current_page * pagination.per_page,
			pagination.total,
		);
		return `Affichage de ${start} à ${end} sur ${this.formatNumber(pagination.total)} transactions`;
	}

	// Filter helper functions
	get typeOptions(): { value: string; label: string }[] {
		return [
			{ value: "ALL", label: "Tous les types" },
			{ value: "PAYMENT", label: "Paiements" },
			{ value: "WITHDRAWAL", label: "Retraits" },
			{ value: "REFUND", label: "Remboursements" },
			{ value: "COMMISSION", label: "Commissions" },
			{ value: "TOPUP", label: "Recharges" },
			{ value: "ADJUSTMENT", label: "Ajustements" },
			{ value: "SYSTEM", label: "Système" },
		];
	}

	get statusOptions(): { value: string; label: string }[] {
		return [
			{ value: "ALL", label: "Tous les statuts" },
			{ value: "SUCCESS", label: "Succès" },
			{ value: "PENDING", label: "En attente" },
			{ value: "FAILED", label: "Échec" },
		];
	}

	get sortOptions(): { value: string; label: string }[] {
		return [
			{ value: "date-desc", label: "Date : Plus récente en premier" },
			{ value: "date-asc", label: "Date : Plus ancienne en premier" },
			{ value: "amount-desc", label: "Montant : Décroissant" },
			{ value: "amount-asc", label: "Montant : Croissant" },
			{ value: "feeAmount-desc", label: "Frais : Décroissant" },
			{ value: "feeAmount-asc", label: "Frais : Croissant" },
		];
	}

	get perPageOptions(): number[] {
		return [10, 25, 50, 100];
	}

	// Stats getters
	getTotalVolume(): string {
		const stats = this.transactionStats();
		return stats ? this.fcfa(stats.totalVolume) : "0 FCFA";
	}

	getTotalTransactions(): number {
		const stats = this.transactionStats();
		return stats ? stats.totalCount : 0;
	}

	getTotalFees(): string {
		const stats = this.transactionStats();
		return stats ? this.fcfa(stats.totalFees) : "0 FCFA";
	}

	getCountByType(type: TransactionType): number {
		const stats = this.transactionStats();
		return stats && stats.countByType[type] ? stats.countByType[type] : 0;
	}

	getVolumeByType(type: TransactionType): number {
		const stats = this.transactionStats();
		return stats && stats.volumeByType[type] ? stats.volumeByType[type] : 0;
	}
}
