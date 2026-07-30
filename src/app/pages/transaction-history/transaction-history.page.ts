import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
	FinancialService,
	Transaction,
	TransactionType,
	TransactionStatus,
	TransactionFilter,
	TransactionStats,
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

	// Search and filter state
	readonly search = signal("");
	readonly type = signal<"ALL" | TransactionType>("ALL");
	readonly status = signal<"ALL" | TransactionStatus>("ALL");
	readonly startDate = signal<string>("");
	readonly endDate = signal<string>("");

	// Modal state
	readonly showDetailModal = signal(false);
	readonly selectedTransaction = signal<Transaction | null>(null);
	// 👈 NOUVEAU : nom du champ copié récemment (pour afficher un check ✓
	// temporaire à côté du bouton copier dans la modale de détail)
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
		// Load transaction history on component initialization
		this.loadData();

		// Reload when search or filters change
		effect(() => {
			const s = this.search();
			const t = this.type();
			const st = this.status();
			const sd = this.startDate();
			const ed = this.endDate();

			// Debounce the search
			const timer = setTimeout(() => {
				this.loadData();
			}, 500);

			return () => clearTimeout(timer);
		});
	}

	loadData(page: number = 1) {
		const filter: TransactionFilter = {
			search: this.search() || undefined,
			type: this.type() === "ALL" ? undefined : this.type(),
			status: this.status() === "ALL" ? undefined : this.status(),
			startDate: this.startDate() || undefined,
			endDate: this.endDate() || undefined,
			page,
			perPage: 50,
		};

		this.financialService.loadTransactionHistory(filter);
	}

	onTypeChange(value: string) {
		this.type.set(value as "ALL" | TransactionType);
	}

	onStatusChange(value: string) {
		this.status.set(value as "ALL" | TransactionStatus);
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

	/**
	 * Copie une valeur dans le presse-papier et affiche brièvement un
	 * indicateur "copié" à côté du champ concerné (identifié par `field`).
	 */
	copyToClipboard(value: string | number | null | undefined, field: string) {
		if (value === null || value === undefined) return;
		navigator.clipboard?.writeText(String(value)).then(() => {
			this.copiedField.set(field);
			setTimeout(() => {
				if (this.copiedField() === field) this.copiedField.set(null);
			}, 1500);
		});
	}

	/** Formate une date ISO en "jj/mm/aaaa à HH:mm", ou '—' si absente. */
	formatDateTime(iso?: string | null): string {
		if (!iso) return "—";
		const d = new Date(iso);
		if (isNaN(d.getTime())) return "—";
		const date = d.toLocaleDateString("fr-FR");
		const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
		return `${date} à ${time}`;
	}

	/**
	 * Durée écoulée entre l'initiation et la validation d'une transaction.
	 * Si `validatedAt` est absent, la transaction est toujours en attente :
	 * on affiche le temps écoulé depuis l'initiation.
	 */
	getDurationLabel(initiatedAt?: string | null, validatedAt?: string | null): string {
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

		return validatedAt ? `Traité en ${duration}` : `En attente depuis ${duration}`;
	}

	/**
	 * Unifie l'affichage des statuts "internes" (PaymentLog, RefundRequest,
	 * WithdrawalRequest) qui ont chacun leurs propres valeurs brutes
	 * (PENDING/SUCCESS/REFUNDED..., pending/approved/rejected/completed...),
	 * distinctes du statut standardisé de la transaction elle-même. Évite
	 * d'avoir un badge codé en dur (ex: variant="approved" partout) qui ne
	 * reflète pas le vrai statut, comme c'était le cas auparavant pour le
	 * bloc "Informations de paiement".
	 */
	getSubStatusMeta(raw?: string | null): { variant: "pending" | "approved" | "rejected"; label: string; icon: string } {
		const value = (raw ?? "").toUpperCase();

		const table: Record<string, { variant: "pending" | "approved" | "rejected"; label: string; icon: string }> = {
			PENDING: { variant: "pending", label: "En attente", icon: "fa-hourglass-half" },
			REFUND_PENDING: { variant: "pending", label: "Remboursement en attente", icon: "fa-hourglass-half" },
			SUCCESS: { variant: "approved", label: "Réussi", icon: "fa-check" },
			APPROVED: { variant: "approved", label: "Approuvé", icon: "fa-check" },
			COMPLETED: { variant: "approved", label: "Terminé", icon: "fa-check-double" },
			REFUNDED: { variant: "approved", label: "Remboursé", icon: "fa-rotate-left" },
			REFUNDED_COMPLETED: { variant: "approved", label: "Remboursé", icon: "fa-rotate-left" },
			REFUNDED_FORCE: { variant: "approved", label: "Remboursé (forcé)", icon: "fa-triangle-exclamation" },
			FAILED: { variant: "rejected", label: "Échec", icon: "fa-xmark" },
			REJECTED: { variant: "rejected", label: "Rejeté", icon: "fa-xmark" },
		};

		return table[value] ?? { variant: "pending", label: raw || "—", icon: "fa-question" };
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
		if (page >= 1) {
			this.loadData(page);
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
			const currentPage = pagination.current_page;
			const start = Math.max(1, currentPage - 2);
			const end = Math.min(totalPages, currentPage + 2);

			if (start > 1) {
				pages.push(1);
				if (start > 2) pages.push(-1); // placeholder for ellipsis
			}

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (end < totalPages) {
				if (end < totalPages - 1) pages.push(-1); // placeholder for ellipsis
				pages.push(totalPages);
			}
		}

		return pages;
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