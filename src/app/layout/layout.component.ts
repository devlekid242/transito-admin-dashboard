import { Component, signal, inject, computed } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import {
	Router,
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
} from "@angular/router";
import { AdminAuthService, AdminUser } from "../services/admin-auth.service";
import { SystemSettingsService } from "../services/system-settings.service";
import { NotificationService } from "../services/notification.service";
import { environment } from "../../environments/environment.prod";

interface NavItem {
	label: string;
	icon: string;
	route: string;
	/** Permission requise pour voir ce lien. Omise = visible par tout admin authentifié. */
	permission?: string;
}
interface NavGroup {
	title: string;
	items: NavItem[];
	/** Rôles admin autorisés à voir CE GROUPE. Omis = visible par tout admin. */
	roles?: string[];
}

const ADMIN_ROLE_LABELS: Record<string, string> = {
	SUPER_ADMIN: "Super Administrateur",
	FINANCE_ADMIN: "Administrateur Finance",
	MODERATION_ADMIN: "Administrateur Modération",
	SUPPORT_ADMIN: "Administrateur Support",
};

@Component({
	selector: "app-layout",
	imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
	templateUrl: "layout.component.html",
	styles: [
		`
			.active-link {
				background-color: rgb(17 24 39);
				color: #4ade80;
				border-left: 3px solid #22c55e;
				padding-left: 0.75rem;
			}
		`,
	],
})
export class LayoutComponent {
	readonly sidebarOpen = signal(false);
	readonly profileOpen = signal(false);

	readonly BaseApiUrl = environment.baseApiUrl; // Assuming you have an environment file with the API base URL

	private router = inject(Router);
	private authService = inject(AdminAuthService);

	/** Profil admin réactif : se met à jour automatiquement si l'admin change (refresh, logout, etc.) */
	readonly admin = toSignal<AdminUser | null>(this.authService.admin$, {
		// initialValue: this.authService.getAdmin(),
		requireSync: true,
	});

	readonly fullName = computed(() => this.admin()?.user?.fullName ?? "—");
	readonly email = computed(() => this.admin()?.user?.email ?? "");
	readonly adminRoleLabel = computed(() => {
		const role = this.admin()?.adminRole;
		return role ? (ADMIN_ROLE_LABELS[role] ?? role) : "";
	});
	readonly profilePhotoUrl = computed(
		() => this.admin()?.user?.profilePhotoUrl ? this.BaseApiUrl + this.admin()?.user?.profilePhotoUrl : null,
	);

	/** Initiales calculées depuis le nom complet, ex: "Jean Dupont" -> "JD" */
	readonly initials = computed(() => {
		const name = this.fullName().trim();
		if (!name || name === "—") return "??";
		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	});

	private readonly systemSettingsService = inject(SystemSettingsService);
	private readonly notificationService = inject(NotificationService);
	readonly systemSettings = this.systemSettingsService.settings;
	readonly unreadNotifications = this.notificationService.unreadCount;

	constructor() {
		this.systemSettingsService.getSettings().subscribe();
	}

	private readonly allNavGroups: NavGroup[] = [
		{
			title: "Accueil",
			items: [
				{
					label: "Dashboard",
					icon: "fa-solid fa-gauge-high",
					route: "/dashboard",
				},
			],
		},
		{
			title: "Finance",
			items: [
				{
					label: "Demandes de retrait",
					icon: "fa-solid fa-hand-holding-dollar",
					route: "/finance/withdrawals",
					permission: "approve_withdrawals",
				},
				{
					label: "Portefeuilles",
					icon: "fa-solid fa-vault",
					route: "/finance/wallets",
					permission: "view_finance",
				},
				{
					label: "Remboursements",
					icon: "fa-solid fa-rotate-left",
					route: "/finance/refunds",
					permission: "view_finance",
				},
				{
					label: "Analyse des revenus",
					icon: "fa-solid fa-chart-area",
					route: "/finance/revenue-analysis",
					permission: "view_finance",
				},
				{
					label: "Stats financières",
					icon: "fa-solid fa-coins",
					route: "/finance/financial-stats",
					permission: "view_finance",
				},
				{
					label: "Historique transactions",
					icon: "fa-solid fa-list-check",
					route: "/finance/transactions",
					permission: "view_finance",
				},
			],
		},
		{
			title: "Modération",
			items: [
				{
					label: "Agences & KYC",
					icon: "fa-solid fa-building-shield",
					route: "/moderation/agencies",
					permission: "view_agencies",
				},
				{
					label: "Utilisateurs",
					icon: "fa-solid fa-users-gear",
					route: "/moderation/users",
					permission: "view_users",
				},
				{
					label: "Réservations",
					icon: "fa-solid fa-ticket",
					route: "/moderation/reservations",
				},
				{
					label: "Trajets",
					icon: "fa-solid fa-route",
					route: "/moderation/trips",
				},
				{
					label: "Candidatures",
					icon: "fa-solid fa-handshake",
					route: "/moderation/applications",
				},
				{
					label: "Stats modération",
					icon: "fa-solid fa-chart-pie",
					route: "/moderation/stats",
				},
			],
		},
		{
			title: "Services clients",
			items: [
				{
					label: "Support",
					icon: "fa-solid fa-headset",
					route: "/moderation/support",
					permission: "view_support",
				},
				{
					label: "FAQs",
					icon: "fa-solid fa-circle-question",
					route: "/moderation/faq-management",
					permission: "view_support",
				},
			],
		},
		{
			title: "Administration",
			// Réservé au Super Admin : gestion des autres admins et des réglages système
			roles: ["SUPER_ADMIN"],
			items: [
				{
					label: "Administrateurs",
					icon: "fa-solid fa-user-shield",
					route: "/admin/admins",
				},
				{
					label: "Système",
					icon: "fa-solid fa-sliders",
					route: "/admin/settings",
				},
				{
					label: "Notifications",
					icon: "fa-solid fa-bell",
					route: "/admin/notifications",
				},
				{
					label: "Mon profil",
					icon: "fa-solid fa-circle-user",
					route: "/admin/profile",
				},
			],
		},
		{
			title: "Analytics",
			items: [
				{
					label: "Rapports",
					icon: "fa-solid fa-chart-line",
					route: "/analytics/reports",
				},
			],
		},
	];

	/** Menu filtré selon le rôle et les permissions réelles de l'admin connecté */
	readonly navGroups = computed<NavGroup[]>(() => {
		const admin = this.admin();
		if (!admin) return [];

		return this.allNavGroups
			.filter(
				(group) =>
					!group.roles || group.roles.includes(admin.adminRole),
			)
			.map((group) => ({
				...group,
				items: group.items.filter(
					(item) =>
						!item.permission ||
						admin.permissions?.includes(item.permission),
				),
			}))
			.filter((group) => group.items.length > 0);
	});

	signOut() {
		// logout() gère déjà la redirection vers /login une fois le nettoyage terminé
		this.authService.logout();
	}
}
