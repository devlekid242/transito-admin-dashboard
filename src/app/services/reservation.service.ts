import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment.prod";
import { catchError, of, tap } from "rxjs";

// Reservation Status Types
export type ReservationStatus =
	| "PENDING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED"
	| "NO_SHOW"
	| "FAILED"
	| "REFUNDED";
export type ReservationPaymentStatus =
	| "PENDING"
	| "PAID"
	| "CANCELLED"
	| "FAILED"
	| "REFUNDED";
export type TicketStatus = "PENDING" | "BOARDED" | "CANCELLED";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

// Reservation Interface for list items
export interface Reservation {
	id: number;
	reference: string;
	user: {
		id: number;
		fullName: string;
		phoneNumber: string;
		email?: string | null;
	} | null;
	trip: {
		id: number;
		route: string;
		date: string | null;
		departure: string;
	} | null;
	agency: {
		id: number;
		name: string;
	} | null;
	totalAmount: number;
	seats: number;
	paymentMethod: string;
	paymentStatus: ReservationPaymentStatus;
	status: ReservationStatus;
	createdAt: string;
	ticketsCount: number;
}

// Detailed Reservation Interface
export interface ReservationDetail extends Reservation {
	tickets: Ticket[];
	paymentLogs: PaymentLog[];
	paymentPhone: string;
}

// Ticket Interface
export interface Ticket {
	id: number;
	passengerName: string;
	passengerPhone: string;
	passengerCni: string;
	seatNumber: number | null;
	qrCodeToken: string;
	status: TicketStatus;
}

// PaymentLog Interface
export interface PaymentLog {
	id: number;
	operator: string;
	reference: string;
	amount: number;
	status: TransactionStatus;
	createdAt: string;
}

// Reservation KPIs Interface
export interface ReservationKpis {
	total: number;
	confirmed: number;
	completed: number;
	cancelled: number;
	noShow: number;
	pending: number;
	failed: number;
	todayVolume: number;
	pendingPayments: number;
	totalRevenue: number;
	newThisWeek: number;
}

// User for SearchSelect
export interface UserSearchItem {
	id: number;
	label: string;
	sublabel: string;
	phoneNumber: string;
	email: string | null;
}

// Trip for SearchSelect
export interface TripSearchItem {
	id: number;
	label: string;
	sublabel: string;
	departureTime: string;
	agencyId: number | null;
	agencyName: string | null;
}

// Payment for SearchSelect
export interface PaymentSearchItem {
	id: number;
	label: string;
	sublabel: string;
	amount: number;
	operator: string;
	reference: string;
	createdAt: string;
}

// Trip Detail Interface for form autofill
export interface TripDetail {
	id: number;
	route: string;
	departureCity: string;
	arrivalCity: string;
	departureTime: string | null;
	departureDate: string | null;
	agency: {
		id: number;
		name: string;
	} | null;
	bus: {
		id: number;
		licensePlate: string;
		capacity: number;
	} | null;
	price: number | null;
}

// Reservation Filters Interface
export interface ReservationFilters {
	startDate?: string;
	endDate?: string;
	status?: ReservationStatus | "ALL";
	agencyId?: number | null;
	search?: string;
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

// List Response Interface
export interface ReservationListResponse {
	success: boolean;
	data: Reservation[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Payment Option Type
export type PaymentOption = "link_existing" | "new_payment";

// Create/Update Reservation DTO
export interface CreateReservationDto {
	userId: number;
	tripId: number;
	totalAmount: number;
	paymentMethod: string;
	paymentOption?: PaymentOption;
	passengerName?: string;
	passengerPhone?: string;
	passengerCni?: string;
	seatCount?: number;
	seatNumbers?: (number | null)[];
	existingPaymentLogId?: number | null;
	notes?: string;
}

// Update Reservation DTO
export interface UpdateReservationDto {
	paymentMethod?: string;
	totalAmount?: number;
	paymentStatus?: string;
	tripId?: number;
}

// Cancel Reservation DTO
export interface CancelReservationDto {
	reason?: string;
	refund?: boolean;
}

@Injectable({
	providedIn: "root",
})
export class ReservationService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signal state for reactive management
	readonly reservations = signal<Reservation[]>([]);
	readonly currentReservation = signal<ReservationDetail | null>(null);
	readonly reservationKpis = signal<ReservationKpis | null>(null);

	// Loading states
	readonly loadingReservations = signal<boolean>(false);
	readonly loadingDetail = signal<boolean>(false);
	readonly loadingKpis = signal<boolean>(false);
	readonly loadingTrips = signal<boolean>(false);
	readonly loadingUsers = signal<boolean>(false);

	// Pagination state
	readonly currentPage = signal<number>(1);
	readonly totalPages = signal<number>(1);
	readonly totalReservations = signal<number>(0);

	// Filter state
	readonly dateRange = signal<{ start: string; end: string } | null>(null);
	readonly statusFilter = signal<ReservationStatus | "ALL">("ALL");
	readonly agencyFilter = signal<number | null>(null);
	readonly searchQuery = signal<string>("");

	// Search items for forms
	readonly userItems = signal<UserSearchItem[]>([]);
	readonly tripItems = signal<TripSearchItem[]>([]);
	readonly agencyItems = signal<UserSearchItem[]>([]);
	readonly paymentItems = signal<PaymentSearchItem[]>([]);

	// Computed signals
	readonly filteredReservations = computed(() => {
		const reservations = this.reservations();
		const search = this.searchQuery().toLowerCase().trim();
		const status = this.statusFilter();
		const agencyId = this.agencyFilter();

		return reservations.filter((reservation) => {
			const matchesSearch =
				search === "" ||
				(reservation.reference?.toLowerCase().includes(search) ??
					false) ||
				(reservation.user?.fullName?.toLowerCase().includes(search) ??
					false) ||
				(reservation.user?.phoneNumber
					?.toLowerCase()
					.includes(search) ??
					false) ||
				(reservation.trip?.route?.toLowerCase().includes(search) ??
					false) ||
				(reservation.agency?.name?.toLowerCase().includes(search) ??
					false);

			const matchesStatus =
				status === "ALL" || reservation.status === status;
			const matchesAgency =
				agencyId === null || reservation.agency?.id === agencyId;

			return matchesSearch && matchesStatus && matchesAgency;
		});
	});

	/**
	 * Get all reservations with optional filtering and pagination.
	 */
	getReservations(
		page: number = 1,
		limit: number = 10,
		filters: ReservationFilters = {},
	) {
		this.loadingReservations.set(true);

		let params = new HttpParams()
			.set("page", page.toString())
			.set("limit", limit.toString());

		if (filters.startDate) {
			params = params.set("start_date", filters.startDate);
		}

		if (filters.endDate) {
			params = params.set("end_date", filters.endDate);
		}

		if (filters.status && filters.status !== "ALL") {
			params = params.set("status", filters.status);
		}

		if (filters.agencyId) {
			params = params.set("agency_id", filters.agencyId.toString());
		}

		if (filters.search) {
			params = params.set("search", filters.search);
		}

		return this.http
			.get<
				ApiResponse<Reservation[]>
			>(`${this.apiBaseUrl}/admin/reservations`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.reservations.set(response.data);
						this.currentPage.set(page);

						if (response.pagination) {
							this.totalPages.set(response.pagination.totalPages);
							this.totalReservations.set(
								response.pagination.total,
							);
						}
					}
				}),
				catchError((error) => {
					console.error("Error fetching reservations:", error);
					return of<ApiResponse<Reservation[]>>({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la récupération des réservations",
					});
				}),
				tap(() => this.loadingReservations.set(false)),
			);
	}

	/**
	 * Get reservation KPI statistics.
	 */
	getReservationKpis(startDate?: string, endDate?: string) {
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
				ApiResponse<ReservationKpis>
			>(`${this.apiBaseUrl}/admin/reservations/kpis`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.reservationKpis.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching reservation KPIs:", error);
					return of<ApiResponse<ReservationKpis>>({
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
	 * Get a single reservation by ID with full details.
	 */
	getReservationDetail(id: number) {
		this.loadingDetail.set(true);

		return this.http
			.get<
				ApiResponse<ReservationDetail>
			>(`${this.apiBaseUrl}/admin/reservations/${id}`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.currentReservation.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching reservation detail ${id}:`,
						error,
					);
					return of<ApiResponse<ReservationDetail>>({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la récupération de la réservation",
					});
				}),
				tap(() => this.loadingDetail.set(false)),
			);
	}

	/**
	 * Create a new reservation.
	 */
	createReservation(data: CreateReservationDto) {
		return this.http
			.post<
				ApiResponse<ReservationDetail>
			>(`${this.apiBaseUrl}/admin/reservations`, data)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Refresh reservations list
						this.refreshReservations();
					}
				}),
				catchError((error) => {
					console.error("Error creating reservation:", error);
					return of<ApiResponse<ReservationDetail>>({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la création de la réservation",
					});
				}),
			);
	}

	/**
	 * Update an existing reservation.
	 */
	updateReservation(id: number, data: UpdateReservationDto) {
		return this.http
			.put<
				ApiResponse<ReservationDetail>
			>(`${this.apiBaseUrl}/admin/reservations/${id}`, data)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Update current reservation if it's the one we're viewing
						if (this.currentReservation()?.id === id) {
							this.currentReservation.set(response.data);
						}
						// Refresh reservations list
						this.refreshReservations();
					}
				}),
				catchError((error) => {
					console.error(`Error updating reservation ${id}:`, error);
					return of<ApiResponse<ReservationDetail>>({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la mise à jour de la réservation",
					});
				}),
			);
	}

	/**
	 * Cancel a reservation.
	 */
	cancelReservation(id: number, data: CancelReservationDto = {}) {
		return this.http
			.put<
				ApiResponse<ReservationDetail>
			>(`${this.apiBaseUrl}/admin/reservations/${id}/cancel`, data)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Update current reservation if it's the one we're viewing
						if (this.currentReservation()?.id === id) {
							this.currentReservation.set(response.data);
						}
						// Refresh reservations list
						this.refreshReservations();
					}
				}),
				catchError((error) => {
					console.error(`Error cancelling reservation ${id}:`, error);
					return of<ApiResponse<ReservationDetail>>({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de l'annulation de la réservation",
					});
				}),
			);
	}

	/**
	 * Get trips for an agency (for SearchSelect).
	 */
	getTripsByAgency(
		agencyId: number | null = null,
		search: string = "",
		limit: number = 20,
	) {
		this.loadingTrips.set(true);

		let params = new HttpParams().set("limit", limit.toString());

		if (agencyId) {
			params = params.set("agency_id", agencyId.toString());
		}

		if (search) {
			params = params.set("search", search);
		}

		return this.http
			.get<
				ApiResponse<TripSearchItem[]>
			>(`${this.apiBaseUrl}/admin/reservations/trips`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.tripItems.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching trips:", error);
					return of<ApiResponse<TripSearchItem[]>>({
						success: false,
						data: [],
					});
				}),
				tap(() => this.loadingTrips.set(false)),
			);
	}

	/**
	 * Get users for search (for SearchSelect).
	 */
	getUsersForSearch(search: string = "", limit: number = 20) {
		this.loadingUsers.set(true);

		let params = new HttpParams().set("limit", limit.toString());

		if (search) {
			params = params.set("search", search);
		}

		return this.http
			.get<
				ApiResponse<UserSearchItem[]>
			>(`${this.apiBaseUrl}/admin/reservations/users`, { params })
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.userItems.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching users:", error);
					return of<ApiResponse<UserSearchItem[]>>({
						success: false,
						data: [],
					});
				}),
				tap(() => this.loadingUsers.set(false)),
			);
	}

	/**
	 * Get unlinked payments for a user (for payment linking).
	 */
	getUnlinkedPaymentsForUser(userId: number) {
		return this.http
			.get<
				ApiResponse<PaymentSearchItem[]>
			>(`${this.apiBaseUrl}/admin/reservations/users/${userId}/unlinked-payments`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.paymentItems.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(
						`Error fetching unlinked payments for user ${userId}:`,
						error,
					);
					return of<ApiResponse<PaymentSearchItem[]>>({
						success: false,
						data: [],
					});
				}),
			);
	}

	/**
	 * Get trip details by ID for form autofill.
	 */
	getTripDetails(tripId: number) {
		return this.http
			.get<
				ApiResponse<TripDetail>
			>(`${this.apiBaseUrl}/admin/reservations/trips/${tripId}`)
			.pipe(
				catchError((error) => {
					console.error(
						`Error fetching trip details ${tripId}:`,
						error,
					);
					return of<ApiResponse<TripDetail>>({
						success: false,
						data: undefined,
					});
				}),
			);
	}

	/**
	 * Refresh reservations list with current filters.
	 */
	refreshReservations() {
		const page = this.currentPage();
		const limit = 10; // Default limit
		const filters: ReservationFilters = {};

		const dateRange = this.dateRange();
		const status = this.statusFilter();
		const agencyId = this.agencyFilter();
		const search = this.searchQuery();

		if (dateRange) {
			filters.startDate = dateRange.start;
			filters.endDate = dateRange.end;
		}
		if (status !== "ALL") filters.status = status;
		if (agencyId) filters.agencyId = agencyId;
		if (search) filters.search = search;

		this.getReservations(page, limit, filters).subscribe();
	}

	/**
	 * Set date range filter.
	 */
	setDateRange(range: { start: string; end: string } | null) {
		this.dateRange.set(range);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Set status filter.
	 */
	setStatusFilter(status: ReservationStatus | "ALL") {
		this.statusFilter.set(status);
		this.currentPage.set(1); // Reset to first page when filtering
	}

	/**
	 * Set agency filter.
	 */
	setAgencyFilter(agencyId: number | null) {
		this.agencyFilter.set(agencyId);
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
	 * Format currency to FCFA.
	 */
	formatCurrency(amount: number): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "XOF",
			currencyDisplay: "narrowSymbol",
		}).format(amount);
	}

	/**
	 * Format currency without symbol (just number with spaces).
	 */
	formatNumber(amount: number): string {
		return amount.toLocaleString("fr-FR");
	}

	/**
	 * Get status label for display.
	 */
	getStatusLabel(status: ReservationStatus | string): string {
		switch (status) {
			case "PENDING":
				return "En attente";
			case "CONFIRMED":
				return "Confirmée";
			case "COMPLETED":
				return "Terminée";
			case "CANCELLED":
				return "Annulée";
			case "NO_SHOW":
				return "No-show";
			case "FAILED":
				return "Échec";
			case "REFUNDED":
				return "Remboursée";
			default:
				return status as string;
		}
	}

	/**
	 * Get status badge variant.
	 */
	getStatusBadgeVariant(
		status: ReservationStatus | string,
	): "approved" | "pending" | "rejected" | "missing" | "verified" {
		switch (status) {
			case "CONFIRMED":
			case "PAID":
				return "approved";
			case "COMPLETED":
				return "verified";
			case "PENDING":
				return "pending";
			case "CANCELLED":
			case "FAILED":
				return "rejected";
			case "NO_SHOW":
				return "missing";
			case "REFUNDED":
				return "approved";
			default:
				return "pending";
		}
	}

	/**
	 * Get payment status label.
	 */
	getPaymentStatusLabel(status: ReservationPaymentStatus | string): string {
		switch (status) {
			case "PAID":
				return "Payé";
			case "PENDING":
				return "En attente";
			case "CANCELLED":
				return "Annulé";
			case "FAILED":
				return "Échec";
			case "REFUNDED":
				return "Remboursé";
			default:
				return status as string;
		}
	}

	/**
	 * Get ticket status label.
	 */
	getTicketStatusLabel(status: TicketStatus | string): string {
		switch (status) {
			case "BOARDED":
				return "Embarqué";
			case "PENDING":
				return "En attente";
			case "CANCELLED":
				return "Annulé";
			default:
				return status as string;
		}
	}

	/**
	 * Get ticket status badge variant.
	 */
	getTicketStatusBadgeVariant(
		status: TicketStatus | string,
	): "approved" | "pending" | "rejected" {
		switch (status) {
			case "BOARDED":
				return "approved";
			case "PENDING":
				return "pending";
			case "CANCELLED":
				return "rejected";
			default:
				return "pending";
		}
	}

	/**
	 * Get transaction status label.
	 */
	getTransactionStatusLabel(status: TransactionStatus | string): string {
		switch (status) {
			case "SUCCESS":
				return "Succès";
			case "PENDING":
				return "En attente";
			case "FAILED":
				return "Échec";
			case "REFUNDED":
				return "Remboursé";
			default:
				return status as string;
		}
	}

	/**
	 * Get payment method label.
	 */
	getPaymentMethodLabel(method: string): string {
		const methodMap: Record<string, string> = {
			WAVE: "Wave",
			MTN_MOMO: "MTN Mobile Money",
			AIRTEL_MONEY: "Airtel Money",
			ORANGE_MONEY: "Orange Money",
			CARTE_BANCAIRE: "Carte bancaire",
			ESPECES: "Espèces",
		};
		return methodMap[method] || method;
	}

	/**
	 * Get reservations count by status.
	 */
	getReservationsByStatus(status: ReservationStatus): number {
		return this.reservations().filter((r) => r.status === status).length;
	}

	/**
	 * Get total amount for all reservations.
	 */
	getTotalAmount(): number {
		return this.reservations().reduce((sum, r) => sum + r.totalAmount, 0);
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
	 * Format time only.
	 */
	formatTime(timeString: string): string {
		const date = new Date(timeString);
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
}
