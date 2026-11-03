import { CommonModule } from "@angular/common";
import {
	Component,
	DestroyRef,
	OnInit,
	inject,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap, tap } from "rxjs";
import {
	ContactMessage,
	ContactMessageListParams,
	ContactMessageService,
	ContactMessageStatus,
} from "../../services/contact-message.service";
import { AlertService } from "../../services/alert.service";
import { DataTableColumn, DataTableComponent } from "../../shared/data-table.component";
import { ModalComponent } from "../../shared/modal.component";
import { PageHeaderComponent } from "../../shared/page-header.component";

const PAGE_SIZE = 20;

@Component({
	selector: "app-contact-messages",
	standalone: true,
	imports: [CommonModule, DataTableComponent, ModalComponent, PageHeaderComponent],
	templateUrl: "contact-messages.page.html",
})
export class ContactMessagesPage implements OnInit {
	private readonly service = inject(ContactMessageService);
	private readonly alerts = inject(AlertService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly queryChanges = new Subject<ContactMessageListParams>();
	private readonly searchChanges = new Subject<string>();

	readonly messages = signal<ContactMessage[]>([]);
	readonly selectedMessage = signal<ContactMessage | null>(null);
	readonly isDetailOpen = signal(false);
	readonly isLoading = signal(false);
	readonly isDetailLoading = signal(false);
	readonly isUpdating = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly search = signal("");
	readonly statusFilter = signal<ContactMessageStatus | "">("");
	readonly page = signal(1);
	readonly total = signal(0);
	readonly totalPages = signal(0);
	readonly pageSize = PAGE_SIZE;

	readonly columns: DataTableColumn[] = [
		{ key: "name", label: "Nom" },
		{ key: "email", label: "E-mail" },
		{ key: "subject", label: "Sujet" },
		{ key: "createdAt", label: "Date" },
		{ key: "status", label: "Statut" },
		{ key: "actions", label: "Action", align: "right" },
	];

	constructor() {
		this.queryChanges
			.pipe(
				switchMap((query) => {
					this.isLoading.set(true);
					this.errorMessage.set(null);
					return this.service.list(query).pipe(
						tap((response) => {
							this.messages.set(response.data);
							this.total.set(response.pagination.total);
							this.totalPages.set(
								response.pagination.totalPages,
							);
						}),
						catchError((error: unknown) => {
							this.errorMessage.set(
								this.alerts.getApiErrorMessage(
									error,
									"Impossible de charger les messages de contact.",
								),
							);
							this.messages.set([]);
							this.total.set(0);
							this.totalPages.set(0);
							return of(null);
						}),
						finalize(() => this.isLoading.set(false)),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();

		this.searchChanges
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((search) => {
				this.search.set(search);
				this.page.set(1);
				this.loadMessages();
			});
	}

	ngOnInit(): void {
		this.loadMessages();
	}

	loadMessages(): void {
		const query: ContactMessageListParams = {
			page: this.page(),
			limit: PAGE_SIZE,
			search: this.search(),
		};
		const status = this.statusFilter();
		if (status) query.status = status;
		this.queryChanges.next(query);
	}

	onSearchChange(search: string): void {
		this.searchChanges.next(search);
	}

	onStatusChange(status: ContactMessageStatus | ""): void {
		this.statusFilter.set(status);
		this.page.set(1);
		this.loadMessages();
	}

	goToPage(page: number): void {
		if (page < 1 || (this.totalPages() > 0 && page > this.totalPages())) {
			return;
		}
		this.page.set(page);
		this.loadMessages();
	}

	openDetails(message: ContactMessage): void {
		this.selectedMessage.set(message);
		this.isDetailOpen.set(true);
		this.isDetailLoading.set(true);
		this.service
			.get(message.id)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.isDetailLoading.set(false)),
			)
			.subscribe({
				next: (response) => this.selectedMessage.set(response.data),
				error: (error: unknown) =>
					this.alerts.apiError(
						error,
						"Impossible de charger le détail du message.",
					),
			});
	}

	closeDetails(): void {
		this.isDetailOpen.set(false);
		this.selectedMessage.set(null);
	}

	async markAsRead(): Promise<void> {
		await this.changeStatus("READ");
	}

	async archive(): Promise<void> {
		await this.changeStatus("ARCHIVED");
	}

	private async changeStatus(status: ContactMessageStatus): Promise<void> {
		const message = this.selectedMessage();
		if (!message || this.isUpdating()) return;

		this.isUpdating.set(true);
		this.service
			.updateStatus(message.id, status)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.isUpdating.set(false)),
			)
			.subscribe({
				next: (response) => {
					const updated = {
						...message,
						...response.data,
						message: message.message,
					};
					this.selectedMessage.set(updated);
					this.messages.update((items) =>
						items.map((item) =>
							item.id === updated.id ? updated : item,
						),
					);
					this.alerts.success(
						status === "READ"
							? "Le message a été marqué comme lu."
							: "Le message a été archivé.",
					);
					this.loadMessages();
				},
				error: (error: unknown) =>
					this.alerts.apiError(
						error,
						"Impossible de mettre à jour le message.",
					),
			});
	}

	async deleteMessage(): Promise<void> {
		const message = this.selectedMessage();
		if (!message || this.isUpdating()) return;

		const confirmed = await this.alerts.confirm(
			"Supprimer ce message ?",
			"Cette action est définitive.",
		);
		if (!confirmed) return;

		this.isUpdating.set(true);
		this.service
			.delete(message.id)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.isUpdating.set(false)),
			)
			.subscribe({
				next: () => {
					if (this.messages().length === 1 && this.page() > 1) {
						this.page.update((currentPage) => currentPage - 1);
					}
					this.messages.update((items) =>
						items.filter((item) => item.id !== message.id),
					);
					this.total.update((value) => Math.max(0, value - 1));
					this.closeDetails();
					this.alerts.success("Le message a été supprimé.");
					this.loadMessages();
				},
				error: (error: unknown) =>
					this.alerts.apiError(
						error,
						"Impossible de supprimer le message.",
					),
			});
	}

	statusLabel(status: ContactMessageStatus): string {
		switch (status) {
			case "NEW":
				return "Nouveau";
			case "READ":
				return "Lu";
			case "ARCHIVED":
				return "Archivé";
		}
	}

	newMessagesOnPage(): number {
		return this.messages().filter((message) => message.status === "NEW")
			.length;
	}

	mailto(message: ContactMessage): string {
		return `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
	}
}
