export type JobRunStatus = "RUNNING" | "OK" | "WARNING" | "ERROR";

export interface JobRunIssue {
	code?: string;
	message?: string;
	reservationId?: number | string;
	ticketId?: number | string;
	tripId?: number | string;
	reference?: string;
	walletId?: number | string;
	[key: string]: unknown;
}

export interface JobRun {
	id: number;
	commandName: string;
	status: JobRunStatus;
	startedAt: string;
	finishedAt: string | null;
	durationMs: number | null;
	exitCode: number | null;
	summary: Record<string, unknown> | null;
	issues: JobRunIssue[] | null;
	errorMessage: string | null;
	host: string | null;
	triggeredBy: string | null;
}

export interface JobRunListResponse {
	items: JobRun[];
	page: number;
	limit: number;
}

/** Libellés lisibles pour les commandes suivies — étoffe cette table au fil des migrations. */
export const JOB_COMMAND_LABELS: Record<string, string> = {
	"transito:finance:audit-workflows": "Audit financier",
	"transito:finance:reconcile": "Réconciliation wallets",
	"transito:bookings:expire-pending": "Expiration réservations",
	"transito:trips:finalize-no-shows": "Finalisation no-show",
	"transito:trips:sync-lifecycle": "Cycle de vie voyages",
	"transito:momo:poll-payments": "Poll paiements MoMo",
	"transito:momo:poll-payouts": "Poll décaissements MoMo",
	"transito:auth:cleanup-otp": "Nettoyage OTP",
	"transito:finance:inspect-ledger": "Inspection ledger",
	"transito:city:import": "Import des villes",
	"transito:api:contract": "Export contrat API",
};

export function jobCommandLabel(commandName: string): string {
	return JOB_COMMAND_LABELS[commandName] ?? commandName;
}