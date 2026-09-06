import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { tap } from "rxjs/operators";
import Pusher, { Channel } from "pusher-js";
import { environment } from "../../environments/environment.prod";
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
	readonly unreadCount = computed(
		() =>
			this.notifications().filter((notification) => !notification.isRead)
				.length,
	);

	private pusherInstance: Pusher | null = null;
	private subscribedChannels = new Map<string, Channel>();
	private audioContext: AudioContext | null = null;

	constructor() {
		this.loadNotifications();
		this.initializeNotificationPermission();
		this.authService.admin$.subscribe((admin) => {
			if (admin) {
				this.connectToPusher();
			} else {
				this.disconnectPusher();
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
					response.map((item) =>
						this.mapBackendToAdminNotification(item),
					),
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
		return this.http
			.patch<BackendNotification>(`${this.apiBaseUrl}/${id}/read`, {})
			.pipe(
				tap(() => {
					this.notifications.update((list) =>
						list.map((n) =>
							n.id === id ? { ...n, isRead: true } : n,
						),
					);
				}),
			);
	}

	markAllAsRead() {
		return this.http
			.patch<{ updated: number }>(`${this.apiBaseUrl}/mark-all-read`, {})
			.pipe(
				tap(() => {
					this.notifications.update((list) =>
						list.map((n) => ({ ...n, isRead: true })),
					);
				}),
			);
	}

	/**
	 * 👈 CORRIGÉ : ce code lisait `window.Pusher`, une variable globale
	 * attendue lorsqu'on charge Pusher via un <script> CDN dans index.html.
	 * Ce projet installe la lib via npm (`pusher-js`), donc `window.Pusher`
	 * était toujours `undefined` : la connexion échouait silencieusement
	 * (juste un console.warn) et aucune notification temps réel n'arrivait
	 * jamais côté admin. On utilise maintenant le vrai import du package.
	 */
	private connectToPusher(): void {
		const token = this.authService.getToken();
		const admin = this.authService.getAdmin();
		if (!token || !admin || this.pusherInstance) {
			return;
		}

		this.pusherInstance = new Pusher(environment.pusherKey, {
			cluster: environment.pusherCluster,
			forceTLS: environment.pusherUseTLS,
			authEndpoint: environment.pusherAuthEndpoint,
			auth: {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		});

		this.pusherInstance.connection.bind("error", (err: unknown) => {
			console.error("Erreur de connexion Pusher", err);
		});

		this.subscribeToChannel(`private-user-${admin.user.id}`);
		this.subscribeToChannel("private-global");
	}

	private disconnectPusher(): void {
		if (!this.pusherInstance) {
			return;
		}
		this.pusherInstance.disconnect();
		this.pusherInstance = null;
		this.subscribedChannels.clear();
	}

	private subscribeToChannel(channelName: string): void {
		if (!this.pusherInstance || this.subscribedChannels.has(channelName)) {
			return;
		}

		const channel = this.pusherInstance.subscribe(channelName);
		channel.bind("new-notification", (payload: BackendNotification) => {
			const notification = this.mapBackendToAdminNotification(payload);
			this.notifications.update((list) => [notification, ...list]);

			// 👈 Afficher notification push et jouer un son
			this.showPushNotification(notification);
			this.playNotificationSound();
		});

		this.subscribedChannels.set(channelName, channel);
	}

	private mapBackendToAdminNotification(
		item: BackendNotification,
	): AdminNotification {
		const normalizedMessage =
			item.message ?? item.content ?? "Nouvelle notification";
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

	/**
	 * Affiche une notification push native du navigateur
	 * Demande la permission si nécessaire
	 */
	private showPushNotification(notification: AdminNotification): void {
		if (!("Notification" in window)) {
			console.warn(
				"Ce navigateur ne supporte pas les notifications push",
			);
			return;
		}

		// Vérifier les permissions
		if (Notification.permission === "granted") {
			this.createNotification(notification);
		} else if (Notification.permission !== "denied") {
			// Demander la permission si pas encore décidé
			Notification.requestPermission().then((permission) => {
				if (permission === "granted") {
					this.createNotification(notification);
				}
			});
		}
	}

	/**
	 * Crée et affiche une notification push
	 */
	private createNotification(notification: AdminNotification): void {
		const categoryEmoji = this.getCategoryEmoji(
			notification.category || "INFO",
		);
		const title = `${categoryEmoji} ${notification.title}`;
		const options: NotificationOptions = {
			body: notification.message,
			icon: "/assets/logo.png", // Adapter le chemin à votre logo
			badge: "/assets/badge.png",
			tag: `notification-${notification.id}`,
			requireInteraction: true, // Garder la notification visible jusqu'au clic
		};

		// Ajouter des données de contexte
		if (notification.payload) {
			options.data = notification.payload;
		}

		const pushNotification = new Notification(title, options);

		// Gérer les clics sur la notification
		pushNotification.onclick = () => {
			pushNotification.close();
			window.focus(); // Ramener l'app au premier plan
		};

		pushNotification.onclose = () => {
			// Marquer comme lu si fermée
			this.markAsRead(notification.id).subscribe();
		};
	}

	/**
	 * Retourne un emoji en fonction de la catégorie de notification
	 */
	private getCategoryEmoji(category: string): string {
		const emojiMap: Record<string, string> = {
			AGENCY_CREATED: "🏢",
			AGENCY_UPDATED: "✏️",
			AGENCY_DELETED: "🗑️",
			AGENCY_POINT_CREATED: "📍",
			AGENCY_POINT_UPDATED: "📍",
			AGENCY_POINT_DELETED: "📍",
			BUS_CREATED: "🚌",
			BUS_UPDATED: "🚌",
			BUS_DELETED: "🚌",
			REFUND_PROCESSED: "💰",
			REFUND_FORCED: "⚠️",
			USER_REGISTERED: "👤",
			TRIP_CANCELLED: "❌",
			CITY_CREATED: "🌆",
			CITY_UPDATED: "🌆",
			CITY_DELETED: "🌆",
			BOOKING: "🎫",
			BOOKING_CREATED: "🎫",
			AGENT_CREATED: "👨‍💼",
			STAFF_CREATED: "👥",
			APPLICATION_APPROVED: "✅",
			ADMIN_CREATED: "🔐",
			RESERVATION_CREATED: "📅",
			RESERVATION_UPDATED: "📅",
			FINANCE: "💳",
			INFO: "ℹ️",
		};
		return emojiMap[category] || "🔔";
	}

	/**
	 * Initialise la permission pour les notifications push
	 */
	private initializeNotificationPermission(): void {
		if (!("Notification" in window)) {
			return;
		}

		// Si pas encore décidé, demander la permission
		if (Notification.permission === "default") {
			Notification.requestPermission();
		}
	}

	/**
	 * Joue un son d'alerte pour les notifications
	 * Crée un son beep synthétisé avec Web Audio API
	 */
	private playNotificationSound(): void {
		try {
			// Créer le contexte audio si nécessaire
			if (!this.audioContext) {
				const AudioContextClass =
					(window as any).AudioContext ||
					(window as any).webkitAudioContext;
				if (!AudioContextClass) {
					console.warn("Web Audio API non disponible");
					return;
				}
				this.audioContext = new AudioContextClass();
			}

			// Vérifier que le contexte audio est bien créé
			if (!this.audioContext) {
				return;
			}

			// Créer une séquence de beeps
			const now = this.audioContext.currentTime;
			const beepDuration = 0.15;
			const beepGap = 0.1;

			// Première beep - fréquence moyenne
			this.playBeep(800, now, beepDuration);

			// Deuxième beep - fréquence plus haute
			this.playBeep(1000, now + beepDuration + beepGap, beepDuration);

			// Troisième beep - fréquence encore plus haute
			this.playBeep(
				1200,
				now + 2 * (beepDuration + beepGap),
				beepDuration,
			);
		} catch (error) {
			console.warn("Impossible de jouer le son de notification:", error);
		}
	}

	/**
	 * Génère une beep sonore à une fréquence et durée spécifiée
	 */
	private playBeep(
		frequency: number,
		startTime: number,
		duration: number,
	): void {
		if (!this.audioContext) {
			return;
		}

		// Créer un oscillateur
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		oscillator.frequency.value = frequency;
		oscillator.type = "sine";

		// Envelope ADSR simple (Attack, Decay, Sustain, Release)
		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Attack
		gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1); // Decay
		gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release

		oscillator.start(startTime);
		oscillator.stop(startTime + duration);
	}
}
