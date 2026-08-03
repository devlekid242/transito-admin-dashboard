import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { catchError, of, tap } from "rxjs";

// Support Ticket Types
export type SupportTicketStatus = "open" | "answered" | "closed" | "pending";
export type SupportTicketPriority = "low" | "medium" | "high" | "critical";
export type SupportTicketCategory =
	| "general"
	| "payment"
	| "reservation"
	| "technical"
	| "account"
	| "other";

// Support Ticket Interface
export interface SupportTicket {
	id: number;
	ticketId: string;
	subject: string;
	message: string;
	user: {
		id: number;
		fullName: string;
		email: string | null;
		phoneNumber: string;
	};
	category: SupportTicketCategory;
	priority: SupportTicketPriority;
	status: SupportTicketStatus;
	createdAt: string;
	updatedAt: string | null;
	responsesCount: number;
	unread: boolean;
	responses?: SupportResponse[];
	lastResponse?: {
		id: number;
		message: string;
		createdAt: string;
		agent?: {
			id: number;
			fullName: string;
		};
	};
}

// Support Response Interface
export interface SupportResponse {
	id: number;
	message: string;
	createdAt: string;
	ticket: SupportTicket;
	agent?: {
		id: number;
		fullName: string;
	};
}

// FAQ Interface
export interface FAQ {
	id: number;
	question: string;
	answer: string;
	category: string;
	orderPriority: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string | null;
}

// Support Statistics Interface
export interface SupportStats {
	open: number;
	answered: number;
	closed: number;
	pending: number;
	highPriority: number;
	criticalPriority: number;
}

@Injectable({
	providedIn: "root",
})
export class SupportService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = environment.apiUrl;

	// State management
	readonly tickets = signal<SupportTicket[]>([]);
	readonly currentTicket = signal<SupportTicket | null>(null);
	readonly faqs = signal<FAQ[]>([]);
	readonly stats = signal<SupportStats | null>(null);
	readonly isLoading = signal<boolean>(false);
	readonly error = signal<string | null>(null);

	// Filter states
	readonly currentFilter = signal<{
		status: SupportTicketStatus | "all";
		priority: SupportTicketPriority | "all";
		category: SupportTicketCategory | "all";
		search: string;
	}>({
		status: "all",
		priority: "all",
		category: "all",
		search: "",
	});

	// FAQ filter states
	readonly currentFAQFilter = signal<{
		category: string | "all";
		search: string;
		activeOnly: boolean;
	}>({
		category: "all",
		search: "",
		activeOnly: true,
	});

	/**
	 * Get all support tickets with optional filtering
	 */
	getTickets(limit: number = 50, offset: number = 0) {
		this.isLoading.set(true);
		this.error.set(null);

		const filter = this.currentFilter();
		let params = new HttpParams()
			.set("limit", limit.toString())
			.set("offset", offset.toString());

		if (filter.status !== "all") {
			params = params.set("status", filter.status);
		}
		if (filter.priority !== "all") {
			params = params.set("priority", filter.priority);
		}
		if (filter.category !== "all") {
			params = params.set("category", filter.category);
		}
		if (filter.search.trim()) {
			params = params.set("search", filter.search.trim());
		}

		return this.http
			.get<{
				data: SupportTicket[];
				total: number;
				limit: number;
				offset: number;
			}>(`${this.apiUrl}/admin/support/tickets`, { params })
			.pipe(
				tap((response) => {
					this.tickets.set(response.data);
					this.isLoading.set(false);
				}),
				catchError((error) => {
					this.isLoading.set(false);
					this.error.set(error.message || "Failed to load tickets");
					return of(null);
				}),
			);
	}

	/**
	 * Get a single ticket with its responses
	 */
	getTicketDetails(id: number) {
		this.isLoading.set(true);
		this.error.set(null);

		return this.http
			.get<{
				ticket: SupportTicket;
				responses: SupportResponse[];
			}>(`${this.apiUrl}/admin/support/tickets/${id}`)
			.pipe(
				tap((response) => {
					this.currentTicket.set({
						...response.ticket,
						responses: response.responses,
					});
					this.isLoading.set(false);
				}),
				catchError((error) => {
					this.isLoading.set(false);
					this.error.set(
						error.message || "Failed to load ticket details",
					);
					return of(null);
				}),
			);
	}

	/**
	 * Update ticket status
	 */
	updateTicketStatus(id: number, status: SupportTicketStatus) {
		return this.http
			.put<{
				message: string;
				ticket: SupportTicket;
			}>(`${this.apiUrl}/admin/support/tickets/${id}/status`, { status })
			.pipe(
				tap((response) => {
					// Update the ticket in the list
					this.tickets.update((tickets) =>
						tickets.map((ticket) =>
							ticket.id === id ? { ...ticket, status } : ticket,
						),
					);
					// Update current ticket if it's the one being updated
					if (this.currentTicket()?.id === id) {
						this.currentTicket.set({
							...this.currentTicket()!,
							status,
						});
					}
				}),
				catchError((error) => {
					this.error.set(
						error.message || "Failed to update ticket status",
					);
					return of(null);
				}),
			);
	}

	/**
	 * Update ticket priority
	 */
	updateTicketPriority(id: number, priority: SupportTicketPriority) {
		return this.http
			.put<{
				message: string;
				ticket: SupportTicket;
			}>(`${this.apiUrl}/admin/support/tickets/${id}/priority`, { priority })
			.pipe(
				tap((response) => {
					this.tickets.update((tickets) =>
						tickets.map((ticket) =>
							ticket.id === id ? { ...ticket, priority } : ticket,
						),
					);
					if (this.currentTicket()?.id === id) {
						this.currentTicket.set({
							...this.currentTicket()!,
							priority,
						});
					}
				}),
				catchError((error) => {
					this.error.set(
						error.message || "Failed to update ticket priority",
					);
					return of(null);
				}),
			);
	}

	/**
	 * Add a response to a support ticket
	 */
	addResponse(ticketId: number, message: string) {
		return this.http
			.post<{
				message: string;
				response: SupportResponse;
			}>(`${this.apiUrl}/admin/support/tickets/${ticketId}/responses`, { message })
			.pipe(
				tap((response) => {
					// Add the response to the current ticket
					if (this.currentTicket()?.id === ticketId) {
						const currentTicket = this.currentTicket();
						if (currentTicket) {
							const updatedTicket: SupportTicket = {
								...currentTicket,
								responsesCount:
									currentTicket.responsesCount + 1,
								status: "answered" as SupportTicketStatus,
							};
							this.currentTicket.set(updatedTicket);
						}
					}
					// Refresh the ticket list
					this.getTickets().subscribe();
				}),
				catchError((error) => {
					this.error.set(error.message || "Failed to add response");
					return of(null);
				}),
			);
	}

	/**
	 * Get support statistics
	 */
	getSupportStats() {
		return this.http
			.get<{
				stats: SupportStats;
				recent_tickets: SupportTicket[];
			}>(`${this.apiUrl}/admin/support/tickets/stats`)
			.pipe(
				tap((response) => {
					this.stats.set(response.stats);
				}),
				catchError((error) => {
					this.error.set(
						error.message || "Failed to load support stats",
					);
					return of(null);
				}),
			);
	}

	// ==================== FAQ MANAGEMENT ====================

	/**
	 * Get all FAQs with optional filtering
	 */
	getFAQs(limit: number = 100, offset: number = 0) {
		this.isLoading.set(true);
		this.error.set(null);

		const filter = this.currentFAQFilter();
		let params = new HttpParams()
			.set("limit", limit.toString())
			.set("offset", offset.toString())
			.set("active_only", filter.activeOnly.toString());

		if (filter.category !== "all") {
			params = params.set("category", filter.category);
		}
		if (filter.search.trim()) {
			params = params.set("search", filter.search.trim());
		}

		return this.http
			.get<{
				data: FAQ[];
				total: number;
				limit: number;
				offset: number;
			}>(`${this.apiUrl}/admin/support/faqs`, { params })
			.pipe(
				tap((response) => {
					this.faqs.set(response.data);
					this.isLoading.set(false);
				}),
				catchError((error) => {
					this.isLoading.set(false);
					this.error.set(error.message || "Failed to load FAQs");
					return of(null);
				}),
			);
	}

	/**
	 * Get a single FAQ
	 */
	getFAQ(id: number) {
		return this.http
			.get<{ faq: FAQ }>(`${this.apiUrl}/admin/support/faqs/${id}`)
			.pipe(
				catchError((error) => {
					this.error.set(error.message || "Failed to load FAQ");
					return of(null);
				}),
			);
	}

	/**
	 * Create a new FAQ
	 */
	createFAQ(faq: Omit<FAQ, "id" | "createdAt" | "updatedAt">) {
		return this.http
			.post<{
				message: string;
				faq: FAQ;
			}>(`${this.apiUrl}/admin/support/faqs`, faq)
			.pipe(
				tap((response) => {
					// Add the new FAQ to the list
					this.faqs.update((faqs) => [response.faq, ...faqs]);
				}),
				catchError((error) => {
					this.error.set(error.message || "Failed to create FAQ");
					return of(null);
				}),
			);
	}

	/**
	 * Update an existing FAQ
	 */
	updateFAQ(
		id: number,
		faq: Partial<Omit<FAQ, "id" | "createdAt" | "updatedAt">>,
	) {
		return this.http
			.put<{
				message: string;
				faq: FAQ;
			}>(`${this.apiUrl}/admin/support/faqs/${id}`, faq)
			.pipe(
				tap((response) => {
					// Update the FAQ in the list
					this.faqs.update((faqs) =>
						faqs.map((existingFAQ) =>
							existingFAQ.id === id ? response.faq : existingFAQ,
						),
					);
				}),
				catchError((error) => {
					this.error.set(error.message || "Failed to update FAQ");
					return of(null);
				}),
			);
	}

	/**
	 * Delete an FAQ
	 */
	deleteFAQ(id: number) {
		return this.http
			.delete<{
				message: string;
			}>(`${this.apiUrl}/admin/support/faqs/${id}`)
			.pipe(
				tap((response) => {
					// Remove the FAQ from the list
					this.faqs.update((faqs) =>
						faqs.filter((existingFAQ) => existingFAQ.id !== id),
					);
				}),
				catchError((error) => {
					this.error.set(error.message || "Failed to delete FAQ");
					return of(null);
				}),
			);
	}

	/**
	 * Get FAQ categories
	 */
	getFAQCategories() {
		return this.http
			.get<{
				categories: string[];
			}>(`${this.apiUrl}/admin/support/faqs/categories`)
			.pipe(
				catchError((error) => {
					this.error.set(
						error.message || "Failed to load FAQ categories",
					);
					return of(null);
				}),
			);
	}

	/**
	 * Reorder FAQs
	 */
	reorderFAQs(orderedIds: number[]) {
		return this.http
			.put<{
				message: string;
			}>(`${this.apiUrl}/admin/support/faqs/reorder`, { orderedIds })
			.pipe(
				tap((response) => {
					// Refresh the FAQ list
					this.getFAQs().subscribe();
				}),
				catchError((error) => {
					this.error.set(error.message || "Failed to reorder FAQs");
					return of(null);
				}),
			);
	}

	/**
	 * Update filter for tickets
	 */
	updateTicketFilter(
		filter: Partial<{
			status: SupportTicketStatus | "all";
			priority: SupportTicketPriority | "all";
			category: SupportTicketCategory | "all";
			search: string;
		}>,
	) {
		this.currentFilter.update((current) => ({ ...current, ...filter }));
	}

	/**
	 * Update filter for FAQs
	 */
	updateFAQFilter(
		filter: Partial<{
			category: string | "all";
			search: string;
			activeOnly: boolean;
		}>,
	) {
		this.currentFAQFilter.update((current) => ({ ...current, ...filter }));
	}

	/**
	 * Reset all filters
	 */
	resetTicketFilters() {
		this.currentFilter.set({
			status: "all",
			priority: "all",
			category: "all",
			search: "",
		});
	}

	/**
	 * Reset FAQ filters
	 */
	resetFAQFilters() {
		this.currentFAQFilter.set({
			category: "all",
			search: "",
			activeOnly: true,
		});
	}

	/**
	 * Mark ticket as read
	 */
	markAsRead(ticketId: number) {
		this.tickets.update((tickets) =>
			tickets.map((ticket) =>
				ticket.id === ticketId ? { ...ticket, unread: false } : ticket,
			),
		);
	}

	/**
	 * Clear error state
	 */
	clearError() {
		this.error.set(null);
	}
}
