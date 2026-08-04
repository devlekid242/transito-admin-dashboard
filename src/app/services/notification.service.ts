import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { AdminAuthService } from "./admin-auth.service";

export interface AdminNotification {
	id: number;
	title: string;
	message: string;
	recipientType: "user" | "agency_all" | "agent" | string;
	recipientId?: number | null;
	category?: string;
	payload?: unknown;
	isRead: boolean;
	createdAt?: string;
	type?: "broadcast" | "targeted";
	target?: string;
	recipients?: number;
	readCount?: number;
	sentAt?: string;
}

export interface CreateNotificationPayload {
	title: string;
	content: string;
	recipientType?: "user" | "agency_all";
	recipientId?: number | null;
	category?: string;
	payload?: unknown;
}

interface BackendNotification {
	id?: number;
	title?: string;
	message?: string;
	content?: string;
	recipientType?: string;
	recipientId?: number | null;
	category?: string;
	type?: string;
	payload?: unknown;
	isRead?: boolean | number;
	createdAt?: string;
}

@Injectable({ providedIn: "root" })
export class NotificationService {
	private readonly http = inject(HttpClient);
	private readonly authService = inject(AdminAuthService);
	private readonly apiBaseUrl = `${environment.apiUrl}/user-notifications`;

	readonly notifications = signal<AdminNotification[]>([]);
	readonly unreadCount = computed(() =>
		this.notifications().filter((notification) => !notification.isRead).length,
	);

	private pusherInstance: any = null;
	private subscribedChannels: string[] = [];

	constructor() {
		this.loadNotifications();
		this.authService.admin$.subscribe((admin) => {
			if (admin) {
				this.connectToPusher();
			}
		});
	}

	loadNotifications(): void {
		const token = this.authService.getToken();
		if (!token) {
			return;
		}

		this.http.get<BackendNotification[]>(this.apiBaseUrl).subscribe({
			next: (response) => {
				this.notifications.set(
					response.map((item) => this.mapBackendToAdminNotification(item)),
				);
			},
			error: (error) => {
				console.error("Impossible de charger les notifications", error);
			},
		});
	}

	create(payload: CreateNotificationPayload) {
		return this.http.post<BackendNotification>(this.apiBaseUrl, payload);
	}

	markAsRead(id: number) {
		return this.http.patch<BackendNotification>(`${this.apiBaseUrl}/${id}/read`, {}).pipe();
	}

	markAllAsRead() {
		return this.http.patch<{ updated: number }>(`${this.apiBaseUrl}/mark-all-read`, {});
	}

	private connectToPusher(): void {
		const token = this.authService.getToken();
		const admin = this.authService.getAdmin();
		if (!token || !admin) {
			return;
		}

		const PusherCtor = (window as Window & typeof globalThis & { Pusher?: any }).Pusher;
		if (!PusherCtor) {
			console.warn("Pusher JS n’est pas chargé dans le dashboard.");
			return;
		}

		if (this.pusherInstance) {
			return;
		}

		this.pusherInstance = new PusherCtor(environment.pusherKey, {
			cluster: environment.pusherCluster,
			forceTLS: environment.pusherUseTLS,
			authEndpoint: environment.pusherAuthEndpoint,
			auth: {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		});

		this.subscribeToChannel(`private-user-${admin.user.id}`);
		this.subscribeToChannel("private-global");
	}

	private subscribeToChannel(channelName: string): void {
		if (this.subscribedChannels.includes(channelName)) {
			return;
		}

		const channel = this.pusherInstance.subscribe(channelName);
		channel.bind("new-notification", (payload: BackendNotification) => {
			this.notifications.update((list) => [
				this.mapBackendToAdminNotification(payload),
				...list,
			]);
		});

		this.subscribedChannels.push(channelName);
	}

	private mapBackendToAdminNotification(item: BackendNotification): AdminNotification {
		const normalizedMessage = item.message ?? item.content ?? "Nouvelle notification";
		const isRead = item.isRead === true || item.isRead === 1;
		const recipientType = item.recipientType ?? "user";
		const type = recipientType === "user" ? "targeted" : "broadcast";
		const createdAt = item.createdAt ?? new Date().toISOString();

		return {
			id: item.id ?? Date.now(),
			title: item.title ?? "Notification",
			message: normalizedMessage,
			recipientType,
			recipientId: item.recipientId ?? null,
			category: item.category ?? "INFO",
			payload: item.payload,
			isRead,
			createdAt,
			type,
			target: recipientType === "user" ? "Utilisateur" : "Diffusion",
			recipients: 1,
			readCount: isRead ? 1 : 0,
			sentAt: this.formatDate(createdAt),
		};
	}

	private formatDate(value: string): string {
		try {
			return new Date(value).toLocaleString("fr-FR", {
				hour: "2-digit",
				minute: "2-digit",
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});
		} catch {
			return value;
		}
	}
}
