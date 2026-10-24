import { Injectable, inject, signal, computed, effect } from "@angular/core";
import { DashboardService, Alert } from "./dashboard.service";
import Pusher, { Channel } from "pusher-js";
import { environment } from "../../environments/environment";
import { AdminAuthService } from "./admin-auth.service";

/**
 * Interface pour un badge de section
 */
export interface SectionBadge {
	sectionTitle: string;
	count: number;
	severity?: "danger" | "warning" | "info";
}

/**
 * Interface pour un badge d'élément de navigation
 */
export interface NavItemBadge {
	route: string;
	count: number;
	severity?: "danger" | "warning" | "info";
}

/**
 * Type des alertes possibles
 */
export type AlertType =
	| "withdrawal"
	| "refund"
	| "agency"
	| "agency_document"
	| "reservation"
	| "support"
	| "user"
	| "trip"
	| "application"
	| "finance"
	| "admin";

/**
 * Service pour gérer les badges de la sidebar
 * Fournit des comptes d'actions par section avec mise à jour en temps réel
 */
@Injectable({
	providedIn: "root",
})
export class SidebarBadgeService {
	private readonly dashboardService = inject(DashboardService);
	private readonly authService = inject(AdminAuthService);

	private readonly apiBaseUrl = environment.apiUrl;

	// Mappage des types d'alerte aux sections de la sidebar
	private readonly alertToSectionMap: Record<AlertType, string> = {
		withdrawal: "Finance",
		refund: "Finance",
		agency: "Modération",
		agency_document: "Modération",
		reservation: "Modération",
		support: "Services clients",
		user: "Modération",
		trip: "Modération",
		application: "Modération",
		finance: "Finance",
		admin: "Administration",
	};

	// Mappage des types d'alerte aux routes spécifiques
	private readonly alertToRouteMap: Record<AlertType, string[]> = {
		withdrawal: ["/finance/withdrawals"],
		refund: ["/finance/refunds", "/finance/financial-stats"],
		agency: ["/moderation/agencies"],
		agency_document: ["/moderation/agencies"],
		reservation: ["/moderation/reservations"],
		support: ["/moderation/support", "/moderation/faq-management"],
		user: ["/moderation/users"],
		trip: ["/moderation/trips"],
		application: ["/moderation/applications"],
		finance: [
			"/finance/wallets",
			"/finance/revenue-analysis",
			"/finance/transactions",
		],
		admin: [
			"/admin/admins",
			"/admin/settings",
			"/admin/job-reports",
			"/admin/cities",
			"/admin/notifications",
			"/admin/audit-logs",
		],
	};

	// Pusher pour les mises à jour en temps réel
	private pusherInstance: Pusher | null = null;
	private subscribedChannels = new Map<string, Channel>();

	// Signal pour stocker les alertes mises à jour
	private readonly allAlerts = signal<Alert[]>([]);

	/**
	 * Badges par section (computed)
	 * Retourne un tableau de SectionBadge avec les comptes agrégés par section
	 */
	readonly sectionBadges = computed<SectionBadge[]>(() => {
		const alerts = this.allAlerts();
		const sectionCounts: Record<
			string,
			{ count: number; severity: string }
		> = {};

		// Initialiser toutes les sections avec 0
		const allSections = [
			"Finance",
			"Modération",
			"Services clients",
			"Administration",
			"Accueil",
			"Analytics",
		];
		allSections.forEach((section) => {
			sectionCounts[section] = { count: 0, severity: "info" };
		});

		// Compter les alertes par section
		alerts.forEach((alert) => {
			const section = this.alertToSectionMap[alert.type as AlertType];
			if (section && sectionCounts[section]) {
				sectionCounts[section].count += alert.count;
				// Prendre la gravité la plus élevée
				if (alert.severity === "danger") {
					sectionCounts[section].severity = "danger";
				} else if (
					alert.severity === "warning" &&
					sectionCounts[section].severity !== "danger"
				) {
					sectionCounts[section].severity = "warning";
				}
			}
		});

		// Convertir en tableau de SectionBadge
		return Object.entries(sectionCounts)
			.filter(([_, value]) => value.count > 0)
			.map(([sectionTitle, value]) => ({
				sectionTitle,
				count: value.count,
				severity: value.severity as "danger" | "warning" | "info",
			}));
	});

	/**
	 * Badges par route (computed)
	 * Retourne un Record avec la route comme clé et le count comme valeur
	 */
	readonly routeBadges = computed<Record<string, number>>(() => {
		const alerts = this.allAlerts();
		const routeCounts: Record<string, number> = {};

		alerts.forEach((alert) => {
			const routes = this.alertToRouteMap[alert.type as AlertType];
			if (routes) {
				routes.forEach((route) => {
					routeCounts[route] =
						(routeCounts[route] || 0) + alert.count;
				});
			}
		});

		return routeCounts;
	});

	/**
	 * Compte total de toutes les alertes
	 */
	readonly totalCount = computed<number>(() => {
		return this.allAlerts().reduce((sum, alert) => sum + alert.count, 0);
	});

	/**
	 * Vérifie s'il y a des alertes non lues
	 */
	readonly hasAlerts = computed<boolean>(() => {
		return this.totalCount() > 0;
	});

	constructor() {
		// Charger les alertes initiales
		this.loadAlerts();

		// Écouter les changements d'authentification pour connecter/déconnecter Pusher
		this.authService.admin$.subscribe((admin) => {
			if (admin) {
				this.connectToPusher();
			} else {
				this.disconnectPusher();
			}
		});

		// Écouter les changements du DashboardService
		effect(() => {
			const alerts = this.dashboardService.alerts();
			this.allAlerts.set(alerts);
		});
	}

	/**
	 * Charge les alertes depuis l'API
	 */
	loadAlerts(): void {
		this.dashboardService.loadAlerts();
	}

	/**
	 * Obtient le count pour une section spécifique
	 */
	getSectionCount(sectionTitle: string): number {
		const sectionBadge = this.sectionBadges().find(
			(s) => s.sectionTitle === sectionTitle,
		);
		return sectionBadge ? sectionBadge.count : 0;
	}

	/**
	 * Obtient le count pour une route spécifique
	 */
	getRouteCount(route: string): number {
		const routeBadges = this.routeBadges();
		return routeBadges[route] || 0;
	}

	/**
	 * Obtient la sévérité pour une section spécifique
	 */
	getSectionSeverity(
		sectionTitle: string,
	): "danger" | "warning" | "info" | undefined {
		const sectionBadge = this.sectionBadges().find(
			(s) => s.sectionTitle === sectionTitle,
		);
		return sectionBadge?.severity;
	}

	/**
	 * Initialise la connexion Pusher pour les mises à jour en temps réel
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
			console.error(
				"Erreur de connexion Pusher (SidebarBadgeService)",
				err,
			);
		});

		// S'abonner aux canaux pertinents
		this.subscribeToChannel("private-admin-dashboard");
	}

	/**
	 * Déconnecte Pusher
	 */
	private disconnectPusher(): void {
		if (!this.pusherInstance) {
			return;
		}
		this.pusherInstance.disconnect();
		this.pusherInstance = null;
		this.subscribedChannels.clear();
	}

	/**
	 * S'abonne à un canal Pusher
	 */
	private subscribeToChannel(channelName: string): void {
		if (!this.pusherInstance || this.subscribedChannels.has(channelName)) {
			return;
		}

		const channel = this.pusherInstance.subscribe(channelName);

		// Écouter les événements de nouvelle alerte
		channel.bind("new-alert", (payload: any) => {
			this.handleNewAlert(payload);
		});

		// Écouter les événements de mise à jour d'alerte
		channel.bind("alert-updated", (payload: any) => {
			this.handleAlertUpdate(payload);
		});

		channel.bind("alert-incremented", (payload: any) => {
			this.handleAlertIncrement(payload);
		});

		// Écouter les événements de suppression d'alerte
		channel.bind("alert-deleted", (payload: any) => {
			this.handleAlertDeleted(payload);
		});

		// Écouter les événements de réinitialisation des alertes
		channel.bind("alerts-refresh", () => {
			this.loadAlerts();
		});

		this.subscribedChannels.set(channelName, channel);
	}

	/**
	 * Gère une nouvelle alerte
	 */
	private handleNewAlert(payload: any): void {
		// Si l'alerte existe déjà, mettre à jour son count
		const existingAlertIndex = this.allAlerts().findIndex(
			(a) => a.id === payload.id,
		);

		if (existingAlertIndex >= 0) {
			this.allAlerts.update((alerts) => {
				const newAlerts = [...alerts];
				newAlerts[existingAlertIndex] = {
					...newAlerts[existingAlertIndex],
					count:
						payload.count !== undefined
							? payload.count
							: newAlerts[existingAlertIndex].count + 1,
					severity:
						payload.severity ||
						newAlerts[existingAlertIndex].severity,
				};
				return newAlerts;
			});
		} else {
			// Sinon, ajouter la nouvelle alerte
			const newAlert: Alert = {
				id: payload.id,
				type: payload.type,
				label: payload.label,
				description: payload.description,
				amount: payload.amount,
				count: payload.count !== undefined ? payload.count : 1,
				severity: payload.severity || "info",
			};
			this.allAlerts.update((alerts) => [...alerts, newAlert]);
		}
	}

	/**
	 * Gère la mise à jour d'une alerte
	 */
	private handleAlertUpdate(payload: any): void {
		this.allAlerts.update((alerts) => {
			return alerts.map((alert) => {
				if (alert.id === payload.id) {
					return {
						...alert,
						count:
							payload.count !== undefined
								? payload.count
								: alert.count,
						severity: payload.severity || alert.severity,
						label: payload.label || alert.label,
						description: payload.description || alert.description,
					};
				}
				return alert;
			});
		});
	}

	/** Incrémente une alerte créée par une notification métier. */
	private handleAlertIncrement(payload: any): void {
		const increment = Number(payload.increment ?? 1);
		const alert = this.allAlerts().find((item) => item.id === payload.id);

		if (!alert) {
			this.loadAlerts();
			return;
		}

		this.allAlerts.update((alerts) =>
			alerts.map((item) =>
				item.id === payload.id
					? { ...item, count: item.count + increment }
					: item,
			),
		);
	}

	/**
	 * Gère la suppression d'une alerte
	 */
	private handleAlertDeleted(payload: any): void {
		this.allAlerts.update((alerts) => {
			return alerts.filter((alert) => alert.id !== payload.id);
		});
	}

	/**
	 * Réinitialise les badges (utile après déconnexion/reconnexion)
	 */
	reset(): void {
		this.allAlerts.set([]);
		this.disconnectPusher();
	}
}
