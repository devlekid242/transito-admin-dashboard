import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { catchError, of, tap } from "rxjs";

// Interfaces for Agency Management
export interface AgencyAgent {
	id: number;
	userId: number | null;
	name: string | null;
	email: string | null;
	phone: string | null;
	role: string;
	status: string;
	commissionRate: number;
}

export interface AgencyBus {
	id: number;
	registrationNumber: string;
	capacity: number;
	brand: string | null;
	model: string | null;
	category: string;
	status: string;
	color: string | null;
	acquisitionDate: string | null;
	lastMaintenanceDate: string | null;
	mileage: number | null;
}

export interface AgencyBoardingPoint {
	id: number;
	city: string;
	name: string;
	address: string | null;
	quartier: string | null;
	phoneNumber: string | null;
	latitude: number | null;
	longitude: number | null;
	pointType: string;
	status: string;
	isActive: boolean;
	hasVipLounge: boolean | number;
	hasWifi: boolean | number;
	hasAc: boolean | number;
	hasParking: boolean | number;
	createdAt: string | null;
}

/** Document justificatif (KYC) uploadé par une agence. */
export interface AgencyDocumentAdmin {
	id: number;
	name: string;
	fileUrl: string;
	type: string | null;
	status: "pending" | "approved" | "rejected" | string;
	expiryDate: string | null;
	createdAt: string;
}

export interface Agency {
	id: number;
	name: string;
	email: string;
	phone: string;
	registrationNumber: string | null;
	address: string | null;
	logoUrl: string | null;
	bannerUrl: string | null;
	websiteUrl: string | null;
	city: string | null;
	mapUrl: string | null;
	description: string | null;
	status: "active" | "suspended" | "pending";
	ratingCache: string;
	commissionRate: string;
	createdAt: string;
	kyc?: string;
	wallet?: {
		balance: number;
		reservedBalance: number;
		availableBalance: number;
		currency: string;
	};
	tripsCount?: number;
	reservationsCount?: number;
	busesCount?: number;
	agentsCount?: number;
	boardingPointsCount?: number;
	admin?: {
		id: number;
		name: string;
		email: string;
		phone: string;
	};
	/** Numéro mobile money validé, utilisé pour les retraits. Absent tant que normalizeAgency() ne l'expose pas côté back. */
	payoutMsisdn?: string | null;
	/** Numéro proposé par l'agence, en attente de validation admin. */
	pendingPayoutMsisdn?: string | null;
	pendingPayoutMsisdnRequestedAt?: string | null;
	/** Documents justificatifs (KYC) de l'agence. */
	documents?: AgencyDocumentAdmin[];
}

/** Ligne renvoyée par GET /admin/agencies/payout-msisdn/pending */
export interface PayoutMsisdnRequest {
	agencyId: number;
	agencyName: string;
	currentPayoutMsisdn: string | null;
	pendingPayoutMsisdn: string;
	requestedAt: string | null;
}

export interface AgencyAdminInput {
	name: string;
	email: string;
	phone: string;
	password: string;
}

export interface AgencyCreateInput {
	name: string;
	email: string;
	phone: string;
	passwordHash: string;
	registrationNumber?: string;
	address?: string;
	logoUrl?: string;
	bannerUrl?: string;
	websiteUrl?: string;
	mapUrl?: string;
	description?: string;
	status?: "active" | "suspended" | "pending";
	commissionRate?: string;
	/** Compte responsable/administrateur de l'agence, créé en même temps que l'agence. */
	admin: AgencyAdminInput;
}

export interface AgencyUpdateInput {
	name?: string;
	email?: string;
	phone?: string;
	passwordHash?: string;
	registrationNumber?: string | null;
	address?: string | null;
	logoUrl?: string | null;
	bannerUrl?: string | null;
	websiteUrl?: string | null;
	mapUrl?: string | null;
	description?: string | null;
	status?: "active" | "suspended" | "pending";
	commissionRate?: string;
	ratingCache?: string;
	admin?: AgencyAdminInput;
}

export interface AgencyStats {
	general: {
		tripsCount: number;
		activeTripsCount: number;
		reservationsCount: number;
		totalRevenue: number;
		fillRate: number;
		cancellationRate: number;
		rating: number;
	};
	finance: {
		balance: number;
		reservedBalance: number;
		availableBalance: number;
		commissionRate: number;
	};
	topRoutes: AgencyRoute[];
	recentReservations: Reservation[];
}

export interface AgencyRoute {
	route: string;
	reservationsCount: number;
	totalRevenue: number;
	fillRate: number;
}

export interface Trip {
	id: number;
	departureCity: string;
	arrivalCity: string;
	departureTime: string;
	estimatedArrivalTime: string | null;
	tripDate: string;
	departureTimeOfDay?: string | null;
	arrivalTimeOfDay?: string | null;
	price: number;
	status: string;
	seatsReserved: number;
	maxSeats: number;
	availableSeats: number;
	driverName: string | null;
	busType: string | null;
	busPlate: string | null;
	createdAt: string;
}

export interface Reservation {
	id: number;
	reference: string | null;
	totalAmount: number;
	paymentMethod: string;
	paymentStatus: string;
	paymentPhone: string;
	createdAt: string;
	tripId: number | null;
	tripRoute: string;
	userId: number | null;
	userName: string | null;
	userPhone: string | null;
}

export interface AgencyListResponse {
	success: boolean;
	data: Agency[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface AgencyDetailResponse {
	success: boolean;
	data: Agency;
}

export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

@Injectable({
	providedIn: "root",
})
export class AgencyService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signals for reactive state management
	readonly agencies = signal<Agency[]>([]);
	readonly currentAgency = signal<Agency | null>(null);
	readonly currentAgencyBuses = signal<AgencyBus[]>([]);
	readonly currentAgencyBordingPoind = signal<AgencyBoardingPoint[]>([]);
	readonly currentAgencyAgents = signal<AgencyAgent[]>([]);      
	readonly agencyStats = signal<AgencyStats | null>(null);
	readonly agencyTrips = signal<Trip[]>([]);
	readonly agencyReservations = signal<Reservation[]>([]);
	readonly kycDistribution = signal<Record<string, number>>({});
	// Toutes les demandes de retrait mobile money en attente, tous agences confondues.
	readonly payoutPendingRequests = signal<PayoutMsisdnRequest[]>([]);

	// Loading states
	readonly loadingAgencies = signal<boolean>(false);
	readonly loadingAgency = signal<boolean>(false); 
	readonly loadingAgencyBordingPoind = signal<boolean>(false); 
	readonly loadingAgencyBuses = signal<boolean>(false);
	readonly loadingAgencyAgents = signal<boolean>(false); 
	readonly loadingStats = signal<boolean>(false);
	readonly loadingTrips = signal<boolean>(false);
	readonly loadingReservations = signal<boolean>(false);
	readonly loadingPayoutRequests = signal<boolean>(false);
	readonly submittingPayoutDecision = signal<boolean>(false);
	readonly submittingDocumentDecision = signal<boolean>(false);

	// Pagination state
	readonly currentPage = signal<number>(1);
	readonly totalPages = signal<number>(1);
	readonly totalAgencies = signal<number>(0);

	// Search and filter state
	readonly searchQuery = signal<string>("");
	readonly statusFilter = signal<string | null>(null);

	// Computed signals
	readonly filteredAgencies = computed(() => {
		const agencies = this.agencies();
		const search = this.searchQuery().toLowerCase().trim();
		const status = this.statusFilter();

		return agencies.filter((agency) => {
			const matchesSearch =
				search === "" ||
				agency.name.toLowerCase().includes(search) ||
				agency.email.toLowerCase().includes(search) ||
				agency.phone.toLowerCase().includes(search) ||
				(agency.registrationNumber?.toLowerCase().includes(search) ??
					false);

			const matchesStatus = status === null || agency.status === status;

			return matchesSearch && matchesStatus;
		});
	});

	/**
	 * Get all agencies with optional filtering and pagination.
	 */
	getAgencies(
		page: number = 1,
		limit: number = 10,
		status?: string,
		search?: string,
	) {
		this.loadingAgencies.set(true);

		let params = new HttpParams()
			.set("page", page.toString())
			.set("limit", limit.toString());

		if (status) {
			params = params.set("status", status);
		}
		if (search) {
			params = params.set("search", search);
		}

		return this.http
			.get<AgencyListResponse>(`${this.apiBaseUrl}/admin/agencies`, {
				params,
			})
			.pipe(
				tap((response) => {
					if (response.success) {
						// Cast status to the correct type
						const agencies = response.data.map((a) => ({
							...a,
							status: a.status as
								| "active"
								| "suspended"
								| "pending",
						}));
						this.agencies.set(agencies);
						this.currentPage.set(page);
						this.totalPages.set(response.pagination.totalPages);
						this.totalAgencies.set(response.pagination.total);
					}
				}),
				catchError((error) => {
					console.error("Error fetching agencies:", error);
					return of({
						success: false,
						message: "Erreur lors de la récupération des agences",
					});
				}),
				tap(() => this.loadingAgencies.set(false)),
			);
	}

	/**
	 * Get a single agency by ID.
	 */
	getAgency(id: number) {
		this.loadingAgency.set(true);

		return this.http
			.get<AgencyDetailResponse>(
				`${this.apiBaseUrl}/admin/agencies/${id}`,
			)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.currentAgency.set(response.data as Agency);
					}
				}),
				catchError((error) => {
					console.error(`Error fetching agency ${id}:`, error);
					return of({
						success: false,
						message: "Agence introuvable",
						data: null,
					});
				}),
				tap(() => this.loadingAgency.set(false)),
			);
	}

	/** Get all buses belonging to an agency from the Admin API. */
	getAgencyBuses(id: number) {
		this.loadingAgencyBuses.set(true);
		return this.http
			.get<ApiResponse<AgencyBus[]>>(`${this.apiBaseUrl}/admin/agencies/${id}/buses`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) this.currentAgencyBuses.set(response.data);
				}),
				catchError((error) => {
					console.error(`Error fetching buses for agency ${id}:`, error);
					this.currentAgencyBuses.set([]);
					return of({ success: false, message: 'Erreur lors de la récupération des bus' });
				}),
				tap(() => this.loadingAgencyBuses.set(false)),
			);
	}

	/** Get all boarding points belonging to an agency from the Admin API. */
	getAgencyBordingPoind(id: number) {
		this.loadingAgencyBordingPoind.set(true);
		return this.http
			.get<ApiResponse<AgencyBoardingPoint[]>>(`${this.apiBaseUrl}/admin/agencies/${id}/boarding-points`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) this.currentAgencyBordingPoind.set(response.data);
				}),
				catchError((error) => {
					console.error(`Error fetching boarding points for agency ${id}:`, error);
					this.currentAgencyBordingPoind.set([]);
					return of({ success: false, message: 'Erreur lors de la récupération des points d’embarquement' });
				}),
				tap(() => this.loadingAgencyBordingPoind.set(false)),
			);
	}

	/** Get all agents, including the agency administrator, from the Admin API. */
	getAgencyAgents(id: number) {
		this.loadingAgencyAgents.set(true);
		return this.http
			.get<ApiResponse<AgencyAgent[]>>(`${this.apiBaseUrl}/admin/agencies/${id}/agents`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) this.currentAgencyAgents.set(response.data);
				}),
				catchError((error) => {
					console.error(`Error fetching agents for agency ${id}:`, error);
					this.currentAgencyAgents.set([]);
					return of({ success: false, message: 'Erreur lors de la récupération des agents' });
				}),
				tap(() => this.loadingAgencyAgents.set(false)),
			);
	}

	/**
	 * Create a new agency.
	 */
	createAgency(input: AgencyCreateInput) {
		return this.http
			.post<
				ApiResponse<Agency>
			>(`${this.apiBaseUrl}/admin/agencies`, input)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Refresh the agencies list
						this.getAgencies().subscribe();
					}
				}),
				catchError((error) => {
					console.error("Error creating agency:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la création de l'agence",
					});
				}),
			);
	}

	/**
	 * Update an existing agency.
	 */
	updateAgency(id: number, input: AgencyUpdateInput) {
		return this.http
			.put<
				ApiResponse<Agency>
			>(`${this.apiBaseUrl}/admin/agencies/${id}`, input)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Update the current agency if it's the one we're viewing
						if (this.currentAgency()?.id === id) {
							this.currentAgency.set(response.data as Agency);
						}
						// Refresh the agencies list
						this.getAgencies().subscribe();
					}
				}),
				catchError((error) => {
					console.error(`Error updating agency ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la mise à jour de l'agence",
					});
				}),
			);
	}

	/**
	 * Toggle agency status (activate/suspend).
	 */
	toggleAgencyStatus(id: number) {
		return this.http
			.put<
				ApiResponse<{ id: number; status: string }>
			>(`${this.apiBaseUrl}/admin/agencies/${id}/toggle-status`, {})
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const newStatus = response.data.status as
							| "active"
							| "suspended"
							| "pending";
						// Update the agency in the list
						this.agencies.update((agencies) =>
							agencies.map((agency) =>
								agency.id === id
									? { ...agency, status: newStatus }
									: agency,
							),
						);
						// Update the current agency if it's the one we're viewing
						if (this.currentAgency()?.id === id) {
							this.currentAgency.update((agency) =>
								agency
									? { ...agency, status: newStatus }
									: null,
							);
						}
					}
				}),
				catchError((error) => {
					console.error(`Error toggling agency status ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du changement de statut",
					});
				}),
			);
	}

	/**
	 * Delete an agency (soft delete - suspend).
	 */
	deleteAgency(id: number) {
		return this.http
			.delete<
				ApiResponse<void>
			>(`${this.apiBaseUrl}/admin/agencies/${id}`)
			.pipe(
				tap((response) => {
					if (response.success) {
						// Remove the agency from the list
						this.agencies.update((agencies) =>
							agencies.filter((agency) => agency.id !== id),
						);
						// Clear current agency if it's the one we're viewing
						if (this.currentAgency()?.id === id) {
							this.currentAgency.set(null);
						}
						// Refresh the list to get updated totals
						this.getAgencies().subscribe();
					}
				}),
				catchError((error) => {
					console.error(`Error deleting agency ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la suppression de l'agence",
					});
				}),
			);
	}

	/**
	 * Get agency statistics.
	 */
	getAgencyStats(agencyId: number, startDate?: string, endDate?: string) {
		this.loadingStats.set(true);

		let params = new HttpParams();
		if (startDate) {
			params = params.set("start_date", startDate);
		}
		if (endDate) {
			params = params.set("end_date", endDate);
		}

		return this.http
			.get<
				ApiResponse<AgencyStats>
			>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/stats`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.agencyStats.set(response.data as AgencyStats);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching stats for agency ${agencyId}:`,
						error,
					);
					return of({
						success: false,
						message:
							"Erreur lors de la récupération des statistiques",
					});
				}),
				tap(() => this.loadingStats.set(false)),
			);
	}

	/**
	 * Get trips for an agency.
	 */
	getAgencyTrips(
		agencyId: number,
		page: number = 1,
		limit: number = 10,
		status?: string,
	) {
		this.loadingTrips.set(true);

		let params = new HttpParams()
			.set("page", page.toString())
			.set("limit", limit.toString());

		if (status) {
			params = params.set("status", status);
		}

		return this.http
			.get<{
				success: boolean;
				data: Trip[];
				pagination: any;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/trips`, { params })
			.pipe(
				tap((response) => {
					if (response.success) {
						this.agencyTrips.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching trips for agency ${agencyId}:`,
						error,
					);
					return of({
						success: false,
						message: "Erreur lors de la récupération des trajets",
					});
				}),
				tap(() => this.loadingTrips.set(false)),
			);
	}

	/**
	 * Get reservations for an agency.
	 */
	getAgencyReservations(
		agencyId: number,
		page: number = 1,
		limit: number = 10,
		status?: string,
	) {
		this.loadingReservations.set(true);

		let params = new HttpParams()
			.set("page", page.toString())
			.set("limit", limit.toString());

		if (status) {
			params = params.set("status", status);
		}

		return this.http
			.get<{
				success: boolean;
				data: Reservation[];
				pagination: any;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/reservations`, { params })
			.pipe(
				tap((response) => {
					if (response.success) {
						this.agencyReservations.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching reservations for agency ${agencyId}:`,
						error,
					);
					return of({
						success: false,
						message:
							"Erreur lors de la récupération des réservations",
					});
				}),
				tap(() => this.loadingReservations.set(false)),
			);
	}

	/**
	 * Get KYC status distribution.
	 */
	getKycDistribution() {
		return this.http
			.get<{
				success: boolean;
				data: Record<string, number>;
			}>(`${this.apiBaseUrl}/admin/agencies/kyc-distribution`)
			.pipe(
				tap((response) => {
					if (response.success) {
						this.kycDistribution.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching KYC distribution:", error);
					return of({
						success: false,
						message:
							"Erreur lors de la récupération de la distribution KYC",
					});
				}),
			);
	}

	/**
	 * Demande de retrait mobile money en attente pour l'agence actuellement affichée
	 * (recoupe currentAgency avec la liste globale des demandes en attente).
	 */
	readonly currentAgencyPayoutRequest = computed(() => {
		const agency = this.currentAgency();
		if (!agency) return null;
		return this.payoutPendingRequests().find((r) => r.agencyId === agency.id) ?? null;
	});

	/**
	 * Liste toutes les demandes de numéro de retrait mobile money en attente de validation.
	 */
	getPendingPayoutMsisdnRequests() {
		this.loadingPayoutRequests.set(true);

		return this.http
			.get<PayoutMsisdnRequest[]>(
				`${this.apiBaseUrl}/admin/agencies/payout-msisdn/pending`,
			)
			.pipe(
				tap((requests) => this.payoutPendingRequests.set(requests ?? [])),
				catchError((error) => {
					console.error("Error fetching pending payout msisdn requests:", error);
					this.payoutPendingRequests.set([]);
					return of([] as PayoutMsisdnRequest[]);
				}),
				tap(() => this.loadingPayoutRequests.set(false)),
			);
	}

	/**
	 * Valide le numéro mobile money proposé par une agence : il devient le payoutMsisdn actif.
	 */
	approvePayoutMsisdn(agencyId: number) {
		this.submittingPayoutDecision.set(true);

		return this.http
			.post<{
				message: string;
				payoutMsisdn: string;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/payout-msisdn/approve`, {})
			.pipe(
				tap((response) => {
					this.payoutPendingRequests.update((list) =>
						list.filter((r) => r.agencyId !== agencyId),
					);
					if (this.currentAgency()?.id === agencyId) {
						this.currentAgency.update((agency) =>
							agency
								? {
										...agency,
										payoutMsisdn: response.payoutMsisdn,
										pendingPayoutMsisdn: null,
										pendingPayoutMsisdnRequestedAt: null,
									}
								: null,
						);
					}
				}),
				catchError((error) => {
					console.error(`Error approving payout msisdn for agency ${agencyId}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la validation du numéro de retrait",
					});
				}),
				tap(() => this.submittingPayoutDecision.set(false)),
			);
	}

	/**
	 * Rejette le numéro mobile money proposé par une agence.
	 */
	rejectPayoutMsisdn(agencyId: number, reason?: string) {
		this.submittingPayoutDecision.set(true);

		return this.http
			.post<{
				message: string;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/payout-msisdn/reject`, {
				reason: reason || undefined,
			})
			.pipe(
				tap(() => {
					this.payoutPendingRequests.update((list) =>
						list.filter((r) => r.agencyId !== agencyId),
					);
					if (this.currentAgency()?.id === agencyId) {
						this.currentAgency.update((agency) =>
							agency
								? { ...agency, pendingPayoutMsisdn: null, pendingPayoutMsisdnRequestedAt: null }
								: null,
						);
					}
				}),
				catchError((error) => {
					console.error(`Error rejecting payout msisdn for agency ${agencyId}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du rejet du numéro de retrait",
					});
				}),
				tap(() => this.submittingPayoutDecision.set(false)),
			);
	}

	/**
	 * Recalcule le statut KYC global d'une agence à partir du statut de ses
	 * documents, avec la même logique que AdminAgencyController::normalizeAgencyWithStats().
	 */
	private computeKycFromDocuments(documents: AgencyDocumentAdmin[]): string {
		if (!documents.length) return "missing";
		const hasApproved = documents.some((d) => d.status === "approved");
		const hasPending = documents.some((d) => d.status === "pending");
		const hasRejected = documents.some((d) => d.status === "rejected");
		if (hasRejected) return "rejected";
		if (hasPending && !hasApproved) return "pending";
		if (hasApproved) return "verified";
		return "missing";
	}

	/** Met à jour un document dans currentAgency() et recalcule le KYC global. */
	private patchCurrentAgencyDocument(agencyId: number, documentId: number, status: AgencyDocumentAdmin["status"]) {
		if (this.currentAgency()?.id !== agencyId) return;

		this.currentAgency.update((agency) => {
			if (!agency) return agency;
			const documents = (agency.documents ?? []).map((d) =>
				d.id === documentId ? { ...d, status } : d,
			);
			return { ...agency, documents, kyc: this.computeKycFromDocuments(documents) };
		});
	}

	/**
	 * Valide un document KYC d'une agence.
	 */
	approveAgencyDocument(agencyId: number, documentId: number) {
		this.submittingDocumentDecision.set(true);

		return this.http
			.post<{
				success: boolean;
				message: string;
				data: AgencyDocumentAdmin;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/documents/${documentId}/approve`, {})
			.pipe(
				tap((response) => {
					if (response.success !== false) {
						this.patchCurrentAgencyDocument(agencyId, documentId, "approved");
					}
				}),
				catchError((error) => {
					console.error(`Error approving document ${documentId} for agency ${agencyId}:`, error);
					return of({
						success: false,
						message: error.error?.message || "Erreur lors de la validation du document",
						data: undefined as unknown as AgencyDocumentAdmin,
					});
				}),
				tap(() => this.submittingDocumentDecision.set(false)),
			);
	}

	/**
	 * Rejette un document KYC d'une agence.
	 */
	rejectAgencyDocument(agencyId: number, documentId: number, reason?: string) {
		this.submittingDocumentDecision.set(true);

		return this.http
			.post<{
				success: boolean;
				message: string;
				data: AgencyDocumentAdmin;
			}>(`${this.apiBaseUrl}/admin/agencies/${agencyId}/documents/${documentId}/reject`, {
				reason: reason || undefined,
			})
			.pipe(
				tap((response) => {
					if (response.success !== false) {
						this.patchCurrentAgencyDocument(agencyId, documentId, "rejected");
					}
				}),
				catchError((error) => {
					console.error(`Error rejecting document ${documentId} for agency ${agencyId}:`, error);
					return of({
						success: false,
						message: error.error?.message || "Erreur lors du rejet du document",
						data: undefined as unknown as AgencyDocumentAdmin,
					});
				}),
				tap(() => this.submittingDocumentDecision.set(false)),
			);
	}

	/**
	 * Set search query.
	 */
	setSearchQuery(query: string) {
		this.searchQuery.set(query);
		this.currentPage.set(1); // Reset to first page when searching
	}

	/**
	 * Set status filter.
	 */
	setStatusFilter(status: string | null) {
		this.statusFilter.set(status);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Refresh agencies list.
	 */
	refreshAgencies() {
		const page = this.currentPage();
		const limit = 10; // Default limit
		const status = this.statusFilter();
		const search = this.searchQuery();

		this.getAgencies(
			page,
			limit,
			status || undefined,
			search || undefined,
		).subscribe();
	}

	/**
	 * Format currency.
	 */
	formatCurrency(amount: number): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "XOF",
			currencyDisplay: "narrowSymbol",
		}).format(amount);
	}

	/**
	 * Format date.
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
	 * Format date time.
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
	 * Format time only.
	 */
	formatTime(timeString: string): string {
		const date = new Date(timeString);
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	/**
	 * Get agency initials for avatar.
	 */
	getInitials(name: string): string {
		return name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	/**
	 * Get KYC badge variant.
	 */
	getKycBadgeVariant(
		kyc: string,
	): "verified" | "info" | "missing" | "rejected" {
		switch (kyc) {
			case "verified":
				return "verified";
			case "pending":
				return "info";
			case "missing":
				return "missing";
			case "rejected":
				return "rejected";
			default:
				return "missing";
		}
	}

	/**
	 * Get badge variant for a single document's status.
	 */
	getDocumentStatusVariant(
		status: string,
	): "verified" | "info" | "missing" | "rejected" {
		switch (status) {
			case "approved":
				return "verified";
			case "pending":
				return "info";
			case "rejected":
				return "rejected";
			default:
				return "missing";
		}
	}

	/**
	 * Get a human-readable label for a document's status.
	 */
	getDocumentStatusLabel(status: string): string {
		switch (status) {
			case "approved":
				return "Validé";
			case "pending":
				return "En attente";
			case "rejected":
				return "Rejeté";
			default:
				return status || "Inconnu";
		}
	}

	/**
	 * Get status badge variant.
	 */
	getStatusBadgeVariant(status: string): "active" | "suspended" | "pending" {
		switch (status) {
			case "active":
				return "active";
			case "suspended":
				return "suspended";
			case "pending":
				return "pending";
			default:
				return "suspended";
		}
	}

	/**
	 * Get KYC count for a specific status.
	 */
	getKycCount(status: string): number {
		return this.kycDistribution()[status] || 0;
	}

	/**
	 * Get agencies count by status.
	 */
	getAgenciesByStatus(status: string): number {
		return this.agencies().filter((a) => a.status === status).length;
	}
}