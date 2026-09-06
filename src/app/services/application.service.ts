import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment.prod";
import { catchError, map, of, tap } from "rxjs";
// Application Status Types
export type ApplicationStatus =
	| "PENDING"
	| "UNDER_REVIEW"
	| "APPROVED"
	| "REJECTED"
	| "ALL";

// Document Type Types
export type DocumentType =
	| "RCCM"
	| "NINEA"
	| "ASSURANCE"
	| "CARTE_GRISE"
	| "CONTRAT"
	| "AUTRE";

// Application Interface for list items
export interface Application {
	id: number;
	ref: string;
	agencyName: string;
	legalRepresentative: string;
	email: string;
	phone: string;
	city: string;
	address: string | null;
	fleetSize: number;
	routesPlanned: string[];
	status: ApplicationStatus;
	statusLabel: string;
	submittedAt: string;
	reviewedAt: string | null;
	reviewer: string | null;
	documentsCount: number;
	createdAt: string;
}

// Application Detail Interface
export interface ApplicationDetail extends Application {
	description: string;
	reviewerNotes: string | null;
	rejectionReason: string | null;
	documents: ApplicationDocument[];
	createdAgency?: {
		id: number;
		name: string;
		email: string;
		phone: string;
	};
	createdAdminUser?: {
		id: number;
		email: string;
		fullName: string;
	};
	updatedAt: string;
}

// Application Document Interface
export interface ApplicationDocument {
	id: number;
	name: string;
	type: DocumentType;
	typeLabel: string;
	typeIcon: string;
	size: string;
	sizeInBytes: number;
	mimeType: string | null;
	originalFilename: string | null;
	url: string;
	filePath: string | null;
	uploadedAt: string;
}

// Application KPIs Interface
export interface ApplicationKpis {
	total: number;
	pending: number;
	underReview: number;
	approved: number;
	rejected: number;
	newThisWeek: number;
	inDateRange: number;
}

// Application Filters Interface
export interface ApplicationFilters {
	status?: ApplicationStatus | "ALL";
	search?: string;
	city?: string;
	startDate?: string;
	endDate?: string;
}

// API Response Interface
export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	timestamp?: string;
}

// Approve Application DTO
export interface ApproveApplicationDto {
	reviewerNotes?: string;
	agencyNameOverride?: string;
	legalRepresentativeOverride?: string;
	temporaryPassword?: string;
}

// Reject Application DTO
export interface RejectApplicationDto {
	rejectionReason: string;
	reviewerNotes?: string;
}

@Injectable({
	providedIn: "root",
})
export class ApplicationService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signal state for reactive management
	readonly applications = signal<Application[]>([]);
	readonly currentApplication = signal<ApplicationDetail | null>(null);
	readonly applicationKpis = signal<ApplicationKpis | null>(null);

	// Loading states
	readonly loadingApplications = signal<boolean>(false);
	readonly loadingDetail = signal<boolean>(false);
	readonly loadingKpis = signal<boolean>(false);
	readonly loadingAction = signal<boolean>(false);

	// Pagination state
	readonly currentPage = signal<number>(1);
	readonly totalPages = signal<number>(1);
	readonly totalApplications = signal<number>(0);

	// Filter state
	readonly statusFilter = signal<ApplicationStatus | "ALL">("ALL");
	readonly searchQuery = signal<string>("");
	readonly cityFilter = signal<string>("");
	readonly dateRange = signal<{ start: string; end: string } | null>(null);

	// Error and success states
	readonly actionSuccess = signal<string | null>(null);
	readonly actionError = signal<string | null>(null);

	// Document type options
	readonly documentTypeOptions = signal<
		{ value: DocumentType; label: string; icon: string }[]
	>([]);

	// Computed signals
	readonly filteredApplications = computed(() => {
		const applications = this.applications();
		const search = this.searchQuery().toLowerCase().trim();
		const status = this.statusFilter();
		const city = this.cityFilter().toLowerCase().trim();

		return applications.filter((application) => {
			const matchesSearch =
				search === "" ||
				(application.ref?.toLowerCase().includes(search) ?? false) ||
				(application.agencyName?.toLowerCase().includes(search) ??
					false) ||
				(application.legalRepresentative
					?.toLowerCase()
					.includes(search) ??
					false) ||
				(application.email?.toLowerCase().includes(search) ?? false) ||
				(application.phone?.toLowerCase().includes(search) ?? false);

			const matchesStatus =
				status === "ALL" || application.status === status;
			const matchesCity =
				city === "" ||
				(application.city?.toLowerCase().includes(city) ?? false);

			return matchesSearch && matchesStatus && matchesCity;
		});
	});

	/**
	 * Get all applications with optional filtering and pagination.
	 */
	getApplications(
		page: number = 1,
		limit: number = 10,
		filters: ApplicationFilters = {},
	) {
		this.loadingApplications.set(true);

		let params = new HttpParams()
			.set("page", page.toString())
			.set("limit", limit.toString());

		if (filters.status && filters.status !== "ALL") {
			params = params.set("status", filters.status);
		}

		if (filters.search) {
			params = params.set("search", filters.search);
		}

		if (filters.city) {
			params = params.set("city", filters.city);
		}

		if (filters.startDate) {
			params = params.set("start_date", filters.startDate);
		}

		if (filters.endDate) {
			params = params.set("end_date", filters.endDate);
		}

		return this.http
			.get<
				ApiResponse<Application[]>
			>(`${this.apiBaseUrl}/admin/applications`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.applications.set(response.data);
						this.currentPage.set(page);

						if (response.pagination) {
							this.totalPages.set(response.pagination.totalPages);
							this.totalApplications.set(
								response.pagination.total,
							);
						}
					}
				}),
				catchError((error) => {
					console.error("Error fetching applications:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la récupération des candidatures",
					});
				}),
				tap(() => this.loadingApplications.set(false)),
			);
	}

	/**
	 * Get application KPI statistics.
	 */
	getApplicationKpis(startDate?: string, endDate?: string) {
		this.loadingKpis.set(true);

		let params = new HttpParams();
		if (startDate) {
			params = params.set("start_date", startDate);
		}
		if (endDate) {
			params = params.set("end_date", endDate);
		}

		return this.http
			.get<
				ApiResponse<ApplicationKpis>
			>(`${this.apiBaseUrl}/admin/applications/kpis`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.applicationKpis.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching application KPIs:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la récupération des KPIs",
					});
				}),
				tap(() => this.loadingKpis.set(false)),
			);
	}

	/**
	 * Get a single application by ID with full details.
	 */
	getApplicationDetail(id: number) {
		this.loadingDetail.set(true);

		return this.http
			.get<
				ApiResponse<ApplicationDetail>
			>(`${this.apiBaseUrl}/admin/applications/${id}`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.currentApplication.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching application detail ${id}:`,
						error,
					);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la récupération de la candidature",
					});
				}),
				tap(() => this.loadingDetail.set(false)),
			);
	}

	/**
	 * Approve an application.
	 */
	approveApplication(id: number, data: ApproveApplicationDto) {
		this.loadingAction.set(true);
		this.actionSuccess.set(null);
		this.actionError.set(null);

		return this.http
			.post<
				ApiResponse<any>
			>(`${this.apiBaseUrl}/admin/applications/${id}/approve`, data)
			.pipe(
				tap((response) => {
					if (response.success) {
						this.actionSuccess.set(
							"Candidature approuvée avec succès",
						);
						// Refresh the application detail
						this.getApplicationDetail(id).subscribe();
						// Refresh the list
						this.refreshApplications();
					} else {
						this.actionError.set(
							response.message || "Erreur lors de l'approbation",
						);
					}
				}),
				catchError((error) => {
					console.error(`Error approving application ${id}:`, error);
					this.actionError.set(
						error.error?.message || "Erreur lors de l'approbation",
					);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de l'approbation",
					});
				}),
				tap(() => this.loadingAction.set(false)),
			);
	}

	/**
	 * Reject an application.
	 */
	rejectApplication(id: number, data: RejectApplicationDto) {
		this.loadingAction.set(true);
		this.actionSuccess.set(null);
		this.actionError.set(null);

		return this.http
			.post<
				ApiResponse<any>
			>(`${this.apiBaseUrl}/admin/applications/${id}/reject`, data)
			.pipe(
				tap((response) => {
					if (response.success) {
						this.actionSuccess.set(
							"Candidature rejetée avec succès",
						);
						// Refresh the application detail
						this.getApplicationDetail(id).subscribe();
						// Refresh the list
						this.refreshApplications();
					} else {
						this.actionError.set(
							response.message || "Erreur lors du rejet",
						);
					}
				}),
				catchError((error) => {
					console.error(`Error rejecting application ${id}:`, error);
					this.actionError.set(
						error.error?.message || "Erreur lors du rejet",
					);
					return of({
						success: false,
						message: error.error?.message || "Erreur lors du rejet",
					});
				}),
				tap(() => this.loadingAction.set(false)),
			);
	}

	/**
	 * Start reviewing an application.
	 */
	startReview(id: number) {
		this.loadingAction.set(true);

		return this.http
			.post<
				ApiResponse<any>
			>(`${this.apiBaseUrl}/admin/applications/${id}/start-review`, {})
			.pipe(
				tap((response) => {
					if (response.success) {
						this.actionSuccess.set("Candidature mise en revue");
						// Refresh the application detail
						this.getApplicationDetail(id).subscribe();
						// Refresh the list
						this.refreshApplications();
					}
				}),
				catchError((error) => {
					console.error(
						`Error starting review for application ${id}:`,
						error,
					);
					this.actionError.set(
						error.error?.message ||
							"Erreur lors de la mise en revue",
					);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la mise en revue",
					});
				}),
				tap(() => this.loadingAction.set(false)),
			);
	}

	/**
	 * Get document type options.
	 */
	getDocumentTypeOptions() {
		if (this.documentTypeOptions().length > 0) {
			return of(this.documentTypeOptions());
		}

		return this.http
			.get<
				ApiResponse<{ value: string; label: string }[]>
			>(`${this.apiBaseUrl}/admin/applications/document-types`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const options = response.data.map((opt) => ({
							value: opt.value as DocumentType,
							label: opt.label,
							icon: this.getDocumentTypeIcon(
								opt.value as DocumentType,
							),
						}));
						this.documentTypeOptions.set(options);
					}
				}),
				map(() => this.documentTypeOptions()),
				catchError((error) => {
					console.error(
						"Error fetching document type options:",
						error,
					);
					// Fallback to default options
					const defaultOptions: {
						value: DocumentType;
						label: string;
						icon: string;
					}[] = [
						{
							value: "RCCM",
							label: "Registre du Commerce et du Crédit Mobilier",
							icon: "fa-file-contract",
						},
						{
							value: "NINEA",
							label: "Numéro d'Identification Nationale des Employeurs",
							icon: "fa-file-lines",
						},
						{
							value: "ASSURANCE",
							label: "Assurance Flotte",
							icon: "fa-shield-halved",
						},
						{
							value: "CARTE_GRISE",
							label: "Carte Grise",
							icon: "fa-car",
						},
						{
							value: "CONTRAT",
							label: "Contrat Social",
							icon: "fa-file-signature",
						},
						{
							value: "AUTRE",
							label: "Autre Document",
							icon: "fa-file",
						},
					];
					this.documentTypeOptions.set(defaultOptions);
					return of(defaultOptions);
				}),
			);
	}

	/**
	 * Get status options.
	 */
	getStatusOptions() {
		return [
			{ value: "ALL", label: "Tous les statuts" },
			{ value: "PENDING", label: "En attente" },
			{ value: "UNDER_REVIEW", label: "En revue" },
			{ value: "APPROVED", label: "Approuvée" },
			{ value: "REJECTED", label: "Rejetée" },
		];
	}

	/**
	 * Refresh applications list with current filters.
	 */
	refreshApplications() {
		const page = this.currentPage();
		const limit = 10; // Default limit
		const filters: ApplicationFilters = {};

		const status = this.statusFilter();
		const search = this.searchQuery();
		const city = this.cityFilter();
		const dateRange = this.dateRange();

		if (status !== "ALL") filters.status = status;
		if (search) filters.search = search;
		if (city) filters.city = city;
		if (dateRange) {
			filters.startDate = dateRange.start;
			filters.endDate = dateRange.end;
		}

		this.getApplications(page, limit, filters).subscribe();
	}

	/**
	 * Set status filter.
	 */
	setStatusFilter(status: ApplicationStatus | "ALL") {
		this.statusFilter.set(status);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Set search query.
	 */
	setSearchQuery(query: string) {
		this.searchQuery.set(query);
		this.currentPage.set(1); // Reset to first page when searching
	}

	/**
	 * Set city filter.
	 */
	setCityFilter(city: string) {
		this.cityFilter.set(city);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Set date range filter.
	 */
	setDateRange(range: { start: string; end: string } | null) {
		this.dateRange.set(range);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Clear all filters.
	 */
	clearFilters() {
		this.statusFilter.set("ALL");
		this.searchQuery.set("");
		this.cityFilter.set("");
		this.dateRange.set(null);
		this.currentPage.set(1);
	}

	/**
	 * Get document type icon.
	 */
	getDocumentTypeIcon(type: DocumentType): string {
		const icons: Record<DocumentType, string> = {
			RCCM: "fa-file-contract",
			NINEA: "fa-file-lines",
			ASSURANCE: "fa-shield-halved",
			CARTE_GRISE: "fa-car",
			CONTRAT: "fa-file-signature",
			AUTRE: "fa-file",
		};
		return icons[type] || "fa-file";
	}

	/**
	 * Get document type label.
	 */
	getDocumentTypeLabel(type: DocumentType): string {
		const labels: Record<DocumentType, string> = {
			RCCM: "Registre du Commerce et du Crédit Mobilier",
			NINEA: "Numéro d'Identification Nationale des Employeurs",
			ASSURANCE: "Assurance Flotte",
			CARTE_GRISE: "Carte Grise",
			CONTRAT: "Contrat Social",
			AUTRE: "Autre Document",
		};
		return labels[type] || type;
	}

	/**
	 * Get status label.
	 */
	getStatusLabel(status: ApplicationStatus): string {
		switch (status) {
			case "PENDING":
				return "En attente";
			case "UNDER_REVIEW":
				return "En revue";
			case "APPROVED":
				return "Approuvée";
			case "REJECTED":
				return "Rejetée";
			default:
				return status;
		}
	}

	/**
	 * Get status badge variant.
	 */
	getStatusBadgeVariant(
		status: ApplicationStatus,
	): "pending" | "info" | "approved" | "rejected" {
		switch (status) {
			case "PENDING":
				return "pending";
			case "UNDER_REVIEW":
				return "info";
			case "APPROVED":
				return "approved";
			case "REJECTED":
				return "rejected";
			default:
				return "pending";
		}
	}

	/**
	 * Format date for display.
	 */
	formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString("fr-FR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	/**
	 * Format date and time for display.
	 */
	formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString("fr-FR", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	/**
	 * Format file size for display.
	 */
	formatFileSize(bytes: number): string {
		const units = ["B", "KB", "MB", "GB"];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return size.toFixed(2) + " " + units[unitIndex];
	}

	/**
	 * Get applications count by status.
	 */
	getApplicationsByStatus(status: ApplicationStatus): number {
		return this.applications().filter((a) => a.status === status).length;
	}

	/**
	 * Get required document types.
	 */
	getRequiredDocumentTypes(): DocumentType[] {
		return ["RCCM", "NINEA", "ASSURANCE"];
	}

	/**
	 * Check if application has all required documents.
	 */
	hasAllRequiredDocuments(application: ApplicationDetail): boolean {
		const requiredTypes = this.getRequiredDocumentTypes();
		const existingTypes = application.documents.map((d) => d.type);

		return requiredTypes.every((type) => existingTypes.includes(type));
	}

	/**
	 * Get missing document types for an application.
	 */
	getMissingDocumentTypes(application: ApplicationDetail): DocumentType[] {
		const requiredTypes = this.getRequiredDocumentTypes();
		const existingTypes = application.documents.map((d) => d.type);

		return requiredTypes.filter(
			(type) => !existingTypes.includes(type),
		) as DocumentType[];
	}

	/**
	 * Clear action messages.
	 */
	clearActionMessages() {
		this.actionSuccess.set(null);
		this.actionError.set(null);
	}
}
