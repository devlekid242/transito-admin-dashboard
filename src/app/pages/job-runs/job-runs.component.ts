import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
	JOB_COMMAND_LABELS,
	JobRun,
	jobCommandLabel,
} from "../../models/job-run.model";
import { JobRunService } from "../../services/job-run.service";

interface StatusOption {
	value: string;
	label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
	{ value: "", label: "Tous les statuts" },
	{ value: "ERROR", label: "Erreur" },
	{ value: "WARNING", label: "Anomalie" },
	{ value: "OK", label: "OK" },
	{ value: "RUNNING", label: "En cours" },
];

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
	OK: { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200", label: "OK" },
	WARNING: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Anomalie" },
	ERROR: { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200", label: "Erreur" },
	RUNNING: { dot: "bg-blue-500 animate-pulse", badge: "bg-blue-50 text-blue-700 border-blue-200", label: "En cours" },
};

@Component({
	selector: "app-job-runs",
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: "job-runs.component.html",
})
export class JobRunsComponent {
	private readonly jobRunService = inject(JobRunService);

	readonly statusOptions = STATUS_OPTIONS;
	readonly commandOptions = Object.entries(JOB_COMMAND_LABELS).map(
		([value, label]) => ({ value, label }),
	);

	readonly latestRuns = signal<JobRun[]>([]);
	readonly loadingLatest = signal(false);

	readonly runs = signal<JobRun[]>([]);
	readonly loading = signal(false);
	readonly loadError = signal<string | null>(null);
	readonly page = signal(1);
	readonly hasMore = signal(false);

	readonly commandFilter = signal<string>("");
	readonly statusFilter = signal<string>("");

	readonly selectedRun = signal<JobRun | null>(null);

	readonly issueCommandsCount = computed(
		() => this.latestRuns().filter((r) => r.status !== "OK").length,
	);

	constructor() {
		this.loadLatest();
		this.loadRuns(1);
	}

	loadLatest(): void {
		this.loadingLatest.set(true);
		this.jobRunService.latest().subscribe({
			next: (runs) => {
				this.latestRuns.set(runs);
				this.loadingLatest.set(false);
			},
			error: () => this.loadingLatest.set(false),
		});
	}

	loadRuns(page: number): void {
		this.loading.set(true);
		this.loadError.set(null);

		this.jobRunService
			.list({
				commandName: this.commandFilter() || null,
				status: this.statusFilter() || null,
				page,
				limit: 30,
			})
			.subscribe({
				next: (res) => {
					this.runs.set(page === 1 ? res.items : [...this.runs(), ...res.items]);
					this.page.set(page);
					this.hasMore.set(res.items.length === 30);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(
						"Impossible de charger les rapports. Réessaie dans quelques instants.",
					);
					this.loading.set(false);
				},
			});
	}

	applyFilters(): void {
		this.loadRuns(1);
	}

	resetFilters(): void {
		this.commandFilter.set("");
		this.statusFilter.set("");
		this.loadRuns(1);
	}

	loadMore(): void {
		this.loadRuns(this.page() + 1);
	}

	refresh(): void {
		this.loadLatest();
		this.loadRuns(1);
	}

	openDetail(run: JobRun): void {
		this.selectedRun.set(run);
	}

	closeDetail(): void {
		this.selectedRun.set(null);
	}

	commandLabel(commandName: string): string {
		return jobCommandLabel(commandName);
	}

	statusStyle(status: string) {
		return STATUS_STYLES[status] ?? STATUS_STYLES["RUNNING"];
	}

	formatDate(iso: string | null): string {
		if (!iso) return "—";
		const date = new Date(iso);
		return date.toLocaleString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	formatDuration(ms: number | null): string {
		if (ms === null) return "—";
		if (ms < 1000) return `${ms} ms`;
		const seconds = ms / 1000;
		if (seconds < 60) return `${seconds.toFixed(1)} s`;
		const minutes = Math.floor(seconds / 60);
		const rest = Math.round(seconds % 60);
		return `${minutes} min ${rest}s`;
	}

	summaryEntries(run: JobRun | null): [string, unknown][] {
		if (!run?.summary) return [];
		return Object.entries(run.summary);
	}
}