import { Routes } from "@angular/router";
import { LoginPage } from "./pages/login/login.page";
import { DashboardPage } from "./pages/dashboard/dashboard.page";
import { WithdrawalsPage } from "./pages/withdrawals/withdrawals.page";
import { WalletsPage } from "./pages/wallets/wallets.page";
import { WalletDetailPage } from "./pages/wallet-detail/wallet-detail.page";
import { RefundsPage } from "./pages/refunds/refunds.page";
import { RevenueAnalysisPage } from "./pages/revenue-analysis/revenue-analysis.page";
import { FinancialStatsPage } from "./pages/financial-stats/financial-stats.page";
import { TransactionHistoryPage } from "./pages/transaction-history/transaction-history.page";
import { AgenciesPage } from "./pages/agencies/agencies.page";
import { AgencyDetailPage } from "./pages/agency-detail/agency-detail.page";
import { AgencyStatsPage } from "./pages/agency-stats/agency-stats.page";
import { AgencyCreatePage } from "./pages/agency-create/agency-create.page";
import { UsersPage } from "./pages/users/users.page";
import { UserProfilePage } from "./pages/user-profile/user-profile.page";
import { SupportPage } from "./pages/support/support.page";
import { FAQManagementPage } from "./pages/faq-management/faq-management.page";
import { ModerationStatsPage } from "./pages/moderation-stats/moderation-stats.page";
import { ReservationsPage } from "./pages/reservations/reservations.page";
import { TripsPage } from "./pages/trips/trips.page";
import { TripDetailPage } from "./pages/trip-detail/trip-detail.page";
import { ApplicationsPage } from "./pages/applications/applications.page";
import { ApplicationDetailPage } from "./pages/application-detail/application-detail.page";
import { AdminsPage } from "./pages/admins/admins.page";
import { AdminCreatePage } from "./pages/admin-create/admin-create.page";
import { SystemSettingsPage } from "./pages/system-settings/system-settings.page";
import { NotificationsPage } from "./pages/notifications/notifications.page";
import { AdminProfilePage } from "./pages/admin-profile/admin-profile.page";
import { ReportsPage } from "./pages/reports/reports.page";
import { authGuard } from "./guards/auth.guard";
import { LayoutComponent } from "./layout/layout.component";
import { CitiesPage } from "./pages/cities/cities.page";
import { JobRunsComponent } from "./pages/job-runs/job-runs.component";
import { AuditLogsPage } from "./pages/audit-logs/audit-logs.page";


export const routes: Routes = [
	{ path: "login", component: LoginPage, title: "Connexion · Transito Admin" },
	{ path: "", redirectTo: "dashboard", pathMatch: "full" },

	{
		path: "",
		component: LayoutComponent,
		canActivate: [authGuard],
		children: [
			{
				path: "dashboard",
				component: DashboardPage,
				title: "Dashboard · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/withdrawals",
				component: WithdrawalsPage,
				title: "Retraits · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/wallets",
				component: WalletsPage,
				title: "Portefeuilles · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/wallets/:id",
				component: WalletDetailPage,
				title: "Détail portefeuille · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/refunds",
				component: RefundsPage,
				title: "Remboursements · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/revenue-analysis",
				component: RevenueAnalysisPage,
				title: "Analyse revenus · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/financial-stats",
				component: FinancialStatsPage,
				title: "Stats financières · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "finance/transactions",
				component: TransactionHistoryPage,
				title: "Historique transactions · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/agencies",
				component: AgenciesPage,
				title: "Agences · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/agencies/create",
				component: AgencyCreatePage,
				title: "Créer agence · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/agencies/:id/edit",
				component: AgencyCreatePage,
				title: "Modifier agence · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/agencies/:id",
				component: AgencyDetailPage,
				title: "Détail agence · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/agencies/:id/stats",
				component: AgencyStatsPage,
				title: "Stats agence · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/users",
				component: UsersPage,
				title: "Utilisateurs · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/users/:id",
				component: UserProfilePage,
				title: "Profil utilisateur · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/reservations",
				component: ReservationsPage,
				title: "Réservations · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/trips",
				component: TripsPage,
				title: "Trajets · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/trips/:id",
				component: TripDetailPage,
				title: "Détail trajet · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/applications",
				component: ApplicationsPage,
				title: "Candidatures · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/applications/:id",
				component: ApplicationDetailPage,
				title: "Détail candidature · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/support",
				component: SupportPage,
				title: "Support · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/faq-management",
				component: FAQManagementPage,
				title: "FAQ Management · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "moderation/stats",
				component: ModerationStatsPage,
				title: "Stats modération · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/admins",
				component: AdminsPage,
				title: "Administrateurs · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/admins/create",
				component: AdminCreatePage,
				title: "Créer admin · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/system",
				redirectTo: "admin/settings",
				pathMatch: "full",
			},
			{
				path: "admin/notifications",
				component: NotificationsPage,
				title: "Notifications · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/audit-logs",
				component: AuditLogsPage,
				title: "Journal d’audit · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/profile",
				component: AdminProfilePage,
				title: "Mon profil · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/job-reports",
				component: JobRunsComponent,
				title: "Rapports des tâches · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/settings",
				component: SystemSettingsPage,
				title: "Paramètres · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "admin/cities",
				component: CitiesPage,
				title: "gestionnaire de ville · Transito Admin",
				canActivate: [authGuard],
			},
			{
				path: "analytics/reports",
				component: ReportsPage,
				title: "Rapports · Transito Admin",
				canActivate: [authGuard],
			},
		],
	},

	{ path: "**", redirectTo: "dashboard" },
];
