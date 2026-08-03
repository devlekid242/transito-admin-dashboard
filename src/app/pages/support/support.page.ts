import { Component, inject, signal, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
	SupportService,
	SupportTicket,
	SupportResponse,
	SupportTicketStatus,
	SupportTicketPriority,
} from "../../services/support.service";
import { PageHeaderComponent } from "../../shared/page-header.component";

@Component({
	selector: "app-support",
	imports: [CommonModule, FormsModule, PageHeaderComponent],
	templateUrl: "support.page.html",
})
export class SupportPage implements OnInit, OnDestroy {
	readonly supportService = inject(SupportService);
	readonly selectedId = signal<number | null>(null);
	readonly search = signal("");
	readonly activeFilter = signal<
		"ALL" | "OPEN" | "ANSWERED" | "CLOSED" | "PENDING"
	>("ALL");

	readonly filters = [
		{ value: "ALL" as const, label: "Tous" },
		{ value: "OPEN" as const, label: "Ouverts" },
		{ value: "ANSWERED" as const, label: "Répondus" },
		{ value: "CLOSED" as const, label: "Fermés" },
		{ value: "PENDING" as const, label: "En attente" },
	];

	private refreshInterval: any;

	constructor() {}

	ngOnInit(): void {
		this.loadTickets();

		// Set up auto-refresh every 30 seconds
		this.refreshInterval = setInterval(() => {
			this.loadTickets();
		}, 30000);

		// Select first ticket if available
		if (this.supportService.tickets().length > 0) {
			this.selectedId.set(this.supportService.tickets()[0].id);
		}
	}

	ngOnDestroy(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
		}
	}

	loadTickets(): void {
		this.supportService.getTickets().subscribe();
		this.supportService.getSupportStats().subscribe();
	}

	selectedConversation(): SupportTicket | null {
		const id = this.selectedId();
		if (!id) return null;
		const ticket = this.supportService.tickets().find((t) => t.id === id);
		if (!ticket) return null;

		const current = this.supportService.currentTicket();
		if (current && current.id === id && current.responses) {
			return { ...ticket, responses: current.responses };
		}
		return ticket;
	}

	filteredConversations() {
		const s = this.search().toLowerCase().trim();
		const f = this.activeFilter();

		return this.supportService.tickets().filter((t) => {
			// Map new status to old format for compatibility
			const oldStatusMap: Record<
				SupportTicketStatus,
				"OPEN" | "ANSWERED" | "CLOSED" | "PENDING"
			> = {
				open: "OPEN",
				answered: "ANSWERED",
				closed: "CLOSED",
				pending: "PENDING",
			};

			const ticketStatus =
				oldStatusMap[t.status as SupportTicketStatus] || "OPEN";
			const matchFilter = f === "ALL" || ticketStatus === f;

			const userName = t.user?.fullName || "";
			const userEmail = t.user?.email || "";
			const userPhone = t.user?.phoneNumber || "";

			const matchSearch =
				!s ||
				userName.toLowerCase().includes(s) ||
				userEmail.toLowerCase().includes(s) ||
				userPhone.toLowerCase().includes(s) ||
				t.subject.toLowerCase().includes(s) ||
				t.message.toLowerCase().includes(s);

			return matchFilter && matchSearch;
		});
	}

	countForFilter(f: string) {
		if (f === "ALL") return this.supportService.tickets().length;

		const oldStatusMap: Record<string, SupportTicketStatus> = {
			OPEN: "open",
			ANSWERED: "answered",
			CLOSED: "closed",
			PENDING: "pending",
		};

		const status = oldStatusMap[f] || "open";
		return this.supportService.tickets().filter((t) => t.status === status)
			.length;
	}

	unreadCount() {
		return this.supportService.tickets().filter((t) => t.unread).length;
	}

	selectConversation(id: number) {
		this.selectedId.set(id);
		// Mark as read in the service
		this.supportService.markAsRead(id);

		// Load detailed ticket info if not already loaded
		if (!this.selectedConversation()) {
			this.supportService.getTicketDetails(id).subscribe();
		}
	}

	sendReply(text: string) {
		if (!text.trim() || !this.selectedId()) return;
		const id = this.selectedId()!;
		this.supportService.addResponse(id, text.trim()).subscribe();
	}

	initials(name: string) {
		return name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	// Status color mapping
	getStatusColor(status: SupportTicketStatus): string {
		switch (status) {
			case "open":
				return "bg-green-50 text-green-700";
			case "answered":
				return "bg-blue-50 text-blue-700";
			case "closed":
				return "bg-gray-100 text-gray-500";
			case "pending":
				return "bg-amber-50 text-amber-700";
			default:
				return "bg-gray-100 text-gray-500";
		}
	}

	// Status label mapping
	getStatusLabel(status: SupportTicketStatus): string {
		switch (status) {
			case "open":
				return "Ouvert";
			case "answered":
				return "Répondu";
			case "closed":
				return "Fermé";
			case "pending":
				return "En attente";
			default:
				return "Inconnu";
		}
	}

	// Priority color mapping
	getPriorityColor(priority: SupportTicketPriority): string {
		switch (priority) {
			case "high":
				return "bg-red-50 text-red-700";
			case "critical":
				return "bg-red-50 text-red-700";
			case "medium":
				return "bg-amber-50 text-amber-700";
			case "low":
				return "bg-gray-50 text-gray-600";
			default:
				return "bg-gray-50 text-gray-600";
		}
	}

	// Priority label mapping
	getPriorityLabel(priority: SupportTicketPriority): string {
		switch (priority) {
			case "high":
				return "Élevé";
			case "critical":
				return "Critique";
			case "medium":
				return "Moyen";
			case "low":
				return "Faible";
			default:
				return priority;
		}
	}

	// User avatar color based on ID for consistency
	getUserAvatarColor(userId: number): string {
		const colors = [
			"bg-red-500",
			"bg-blue-500",
			"bg-green-500",
			"bg-purple-500",
			"bg-pink-500",
			"bg-orange-500",
			"bg-teal-500",
			"bg-indigo-500",
		];
		return colors[userId % colors.length];
	}

	// Update filter from the UI
	updateFilter(
		filter: "ALL" | "OPEN" | "ANSWERED" | "CLOSED" | "PENDING",
	): void {
		this.activeFilter.set(filter);
	}

	// Update search from the UI
	updateSearch(search: string): void {
		this.search.set(search);
	}

	// Update ticket status
	updateTicketStatus(status: SupportTicketStatus): void {
		const id = this.selectedId();
		if (!id) return;

		this.supportService.updateTicketStatus(id, status).subscribe({
			next: () => {
				this.loadTickets();
			},
		});
	}

	// Update ticket priority
	updateTicketPriority(priority: SupportTicketPriority): void {
		const id = this.selectedId();
		if (!id) return;

		this.supportService.updateTicketPriority(id, priority).subscribe({
			next: () => {
				this.loadTickets();
			},
		});
	}

	// Refresh tickets manually
	refreshTickets(): void {
		this.loadTickets();
	}
}
