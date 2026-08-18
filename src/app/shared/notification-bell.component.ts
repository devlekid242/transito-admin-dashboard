import {
	Component,
	ElementRef,
	HostListener,
	computed,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
	AdminNotification,
	NotificationService,
} from "../services/notification.service";

@Component({
	selector: "app-notification-bell",
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: "notification-bell.component.html",
})
export class NotificationBellComponent {
	private readonly notificationService = inject(NotificationService);
	private readonly elementRef = inject(ElementRef);

	readonly open = signal(false);
	readonly unreadCount = this.notificationService.unreadCount;
	readonly recent = computed(() =>
		this.notificationService.notifications().slice(0, 8),
	);

	toggle(): void {
		this.open.update((v) => !v);
	}

	close(): void {
		this.open.set(false);
	}

	/** Ferme le menu si on clique en dehors */
	@HostListener("document:click", ["$event"])
	onDocumentClick(event: MouseEvent): void {
		if (!this.elementRef.nativeElement.contains(event.target)) {
			this.close();
		}
	}

	onNotificationClick(notification: AdminNotification): void {
		if (!notification.isRead) {
			this.notificationService.markAsRead(notification.id).subscribe({
				error: (err) =>
					console.error("Impossible de marquer comme lu", err),
			});
		}
	}

	markAllAsRead(): void {
		this.notificationService.markAllAsRead().subscribe({
			error: (err) =>
				console.error("Impossible de tout marquer comme lu", err),
		});
	}

	categoryIcon(category?: string): string {
		switch (category) {
			case "PAYMENT":
				return "fa-solid fa-money-bill-wave text-green-600";
			case "BOOKING":
				return "fa-solid fa-ticket text-violet-600";
			case "TRIP":
				return "fa-solid fa-bus text-blue-600";
			case "PROMOTION":
				return "fa-solid fa-tag text-amber-600";
			default:
				return "fa-solid fa-circle-info text-gray-500";
		}
	}
}