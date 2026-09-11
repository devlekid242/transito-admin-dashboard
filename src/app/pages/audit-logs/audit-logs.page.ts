import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
	AuditLog,
	AuditLogPagination,
} from "../../models/audit-log.model";
import { AuditLogService } from "../../services/audit-log.service";

@Component({
	selector: "app-audit-logs",
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: "audit-logs.page.html",
})
export class AuditLogsPage {
	private readonly auditLogService = inject(AuditLogService);

	readonly logs = signal<AuditLog[]>([]);
	readonly pagination = signal<AuditLogPagination | null>(null);
	readonly loading = signal(false);
	readonly loadError = signal<string | null>(null);
	readonly selectedLog = signal<AuditLog | null>(null);

	readonly actorType = signal("");
	readonly action = signal("");
	readonly targetType = signal("");
	readonly targetId = signal("");
	readonly from = signal("");
	readonly to = signal("");

	constructor() {
		this.loadLogs(1);
	}

	loadLogs(page: number): void {
		this.loading.set(true);
		this.loadError.set(null);

		this.auditLogService
			.list({
				actorType: this.actorType() || null,
				action: this.action() || null,
				targetType: this.targetType() || null,
				targetId: this.targetId() || null,
				from: this.from() || null,
				to: this.to() || null,
				page,
				limit: 50,
			})
			.subscribe({
				next: (response) => {
					this.logs.set(response.data.items);
					this.pagination.set(response.data.pagination);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(
						"Impossible de charger le journal d’audit. Réessayez dans quelques instants.",
					);
					this.loading.set(false);
				},
			});
	}

	applyFilters(): void {
		this.loadLogs(1);
	}

	resetFilters(): void {
		this.actorType.set("");
		this.action.set("");
		this.targetType.set("");
		this.targetId.set("");
		this.from.set("");
		this.to.set("");
		this.loadLogs(1);
	}

	openDetail(log: AuditLog): void {
		this.selectedLog.set(log);
	}

	closeDetail(): void {
		this.selectedLog.set(null);
	}

	formatDate(value: string | null): string {
		if (!value) return "—";
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? "—"
			: date.toLocaleString("fr-FR", {
					dateStyle: "short",
					timeStyle: "short",
			  });
	}

	formatValue(value: unknown): string {
		if (value === null || value === undefined) return "—";
		if (typeof value === "string") return value;
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}

	get pages(): number[] {
		const totalPages = this.pagination()?.pages ?? 0;
		const currentPage = this.pagination()?.page ?? 1;
		const start = Math.max(1, currentPage - 2);
		const end = Math.min(totalPages, currentPage + 2);
		return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
	}

	canReset(): boolean {
		return Boolean(
			this.actorType() ||
				this.action() ||
				this.targetType() ||
				this.targetId() ||
				this.from() ||
				this.to(),
		);
	}
}