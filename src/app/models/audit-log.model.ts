export interface AuditLog {
	id: number;
	actorType: string | null;
	actorId: number | string | null;
	action: string;
	targetType: string | null;
	targetId: number | string | null;
	before: unknown;
	after: unknown;
	metadata: unknown;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

export interface AuditLogPagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
}

export interface AuditLogResponse {
	success: boolean;
	data: {
		items: AuditLog[];
		pagination: AuditLogPagination;
	};
}

export interface AuditLogFilters {
	actorType?: string | null;
	action?: string | null;
	targetType?: string | null;
	targetId?: string | null;
	from?: string | null;
	to?: string | null;
	page?: number;
	limit?: number;
}