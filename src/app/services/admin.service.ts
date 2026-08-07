import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, of, tap } from "rxjs";
import { environment } from "../../environments/environment.prod";
import { UserStatus } from "./user.service";

export type AdminRoleType =
	| "SUPER_ADMIN"
	| "FINANCE_ADMIN"
	| "MODERATION_ADMIN"
	| "SUPPORT_ADMIN";

export interface AdminUserRow {
	id: number;
	userId: number;
	fullName: string;
	email: string | null;
	phoneNumber: string;
	status: UserStatus;
	adminRole: AdminRoleType;
	permissions: string[];
	department?: string | null;
	notes?: string | null;
	lastLoginAt?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	profilePhotoUrl?: string | null;
	avatarColor: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data: T | null;
	message?: string;
}

export interface AdminListResponse extends ApiResponse<AdminUserRow[]> {
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type AdminDetailResponse = ApiResponse<AdminUserRow>;

export interface CreateAdminRequest {
	fullName: string;
	email: string;
	phoneNumber: string;
	password: string;
	adminRole: AdminRoleType;
	permissions?: string[];
	department?: string;
	notes?: string;
}

export interface UpdateAdminRequest {
	fullName?: string;
	email?: string;
	phoneNumber?: string;
	password?: string;
	status?: UserStatus;
	adminRole?: AdminRoleType;
	permissions?: string[];
	department?: string;
	notes?: string;
}

@Injectable({
	providedIn: "root",
})
export class AdminService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	readonly admins = signal<AdminUserRow[]>([]);
	readonly currentAdmin = signal<AdminUserRow | null>(null);
	readonly loadingAdmins = signal(false);
	readonly loadingAdmin = signal(false);
	readonly saving = signal(false);
	readonly deleting = signal(false);
	readonly lastError = signal<string | null>(null);
	readonly currentPage = signal(1);
	readonly totalPages = signal(1);
	readonly totalAdmins = signal(0);
	readonly search = signal("");
	readonly roleFilter = signal<AdminRoleType | "ALL">("ALL");
	readonly statusFilter = signal<UserStatus | "ALL">("ALL");

	get roleOptions() {
		return [
			{ value: "SUPER_ADMIN" as AdminRoleType, label: "Super Admin" },
			{ value: "FINANCE_ADMIN" as AdminRoleType, label: "Finance" },
			{ value: "MODERATION_ADMIN" as AdminRoleType, label: "Modération" },
			{ value: "SUPPORT_ADMIN" as AdminRoleType, label: "Support" },
		];
	}

	get rolePermissionsMap(): Record<AdminRoleType, string[]> {
		return {
			SUPER_ADMIN: [
				"Voir utilisateurs",
				"Gérer administrateurs",
				"Voir finances",
				"Valider retraits",
				"Forcer remboursements",
				"Gérer agences",
				"Valider KYC",
				"Répondre tickets",
				"Voir rapports",
			],
			FINANCE_ADMIN: [
				"Voir finances",
				"Valider retraits",
				"Forcer remboursements",
			],
			MODERATION_ADMIN: [
				"Voir utilisateurs",
				"Gérer agences",
				"Valider KYC",
				"Gérer utilisateurs",
			],
			SUPPORT_ADMIN: [
				"Voir utilisateurs",
				"Voir agences",
				"Voir support",
				"Répondre tickets",
			],
		};
	}

	getAdmins(page: number = 1, limit: number = 10) {
		this.loadingAdmins.set(true);
		this.lastError.set(null);

		let params = new HttpParams()
			.set("page", String(page))
			.set("limit", String(limit));

		if (this.roleFilter() !== "ALL") {
			params = params.set("role", this.roleFilter());
		}

		if (this.statusFilter() !== "ALL") {
			params = params.set("status", this.statusFilter());
		}

		if (this.search().trim().length > 0) {
			params = params.set("search", this.search().trim());
		}

		return this.http
			.get<AdminListResponse>(`${this.apiBaseUrl}/admin/admins`, {
				params,
			})
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.admins.set(response.data);
						this.currentPage.set(page);
						this.totalAdmins.set(
							response.pagination?.total ?? response.data.length,
						);
						this.totalPages.set(
							response.pagination?.totalPages ?? 1,
						);
					}
				}),
				catchError((error) => {
					console.error("Error fetching admins:", error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors du chargement des administrateurs",
					);
					return of({
						success: false,
						data: [],
					} as AdminListResponse);
				}),
				tap(() => this.loadingAdmins.set(false)),
			);
	}

	getAdmin(id: number) {
		this.loadingAdmin.set(true);
		this.lastError.set(null);

		return this.http
			.get<AdminDetailResponse>(`${this.apiBaseUrl}/admin/admins/${id}`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.currentAdmin.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(`Error fetching admin ${id}:`, error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors du chargement de l'administrateur",
					);
					return of({
						success: false,
						data: null,
					} as AdminDetailResponse);
				}),
				tap(() => this.loadingAdmin.set(false)),
			);
	}

	createAdmin(payload: CreateAdminRequest) {
		this.saving.set(true);
		this.lastError.set(null);

		return this.http
			.post<AdminDetailResponse>(
				`${this.apiBaseUrl}/admin/admins`,
				payload,
			)
			.pipe(
				tap((response) => {
					const createdAdmin = response.data;
					if (response.success && createdAdmin) {
						this.admins.update((current) => [
							createdAdmin,
							...current,
						]);
						this.totalAdmins.update((count) => count + 1);
					}
				}),
				catchError((error) => {
					console.error("Error creating admin:", error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors de la création de l'administrateur",
					);
					return of({
						success: false,
						data: null,
					} as AdminDetailResponse);
				}),
				tap(() => this.saving.set(false)),
			);
	}

	updateAdmin(id: number, payload: UpdateAdminRequest) {
		this.saving.set(true);
		this.lastError.set(null);

		return this.http
			.put<AdminDetailResponse>(
				`${this.apiBaseUrl}/admin/admins/${id}`,
				payload,
			)
			.pipe(
				tap((response) => {
					const updatedAdmin = response.data;
					if (response.success && updatedAdmin) {
						this.admins.update((list) =>
							list.map((admin) =>
								admin.id === id ? updatedAdmin : admin,
							),
						);
						if (this.currentAdmin()?.id === id) {
							this.currentAdmin.set(updatedAdmin);
						}
					}
				}),
				catchError((error) => {
					console.error(`Error updating admin ${id}:`, error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors de la mise à jour de l'administrateur",
					);
					return of({
						success: false,
						data: null,
					} as AdminDetailResponse);
				}),
				tap(() => this.saving.set(false)),
			);
	}

	deleteAdmin(id: number) {
		this.deleting.set(true);
		this.lastError.set(null);

		return this.http
			.delete<AdminDetailResponse>(
				`${this.apiBaseUrl}/admin/admins/${id}`,
			)
			.pipe(
				tap((response) => {
					if (response.success) {
						this.admins.update((list) =>
							list.filter((admin) => admin.id !== id),
						);
						this.totalAdmins.update((count) =>
							Math.max(0, count - 1),
						);
					}
				}),
				catchError((error) => {
					console.error(`Error deleting admin ${id}:`, error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors de la suppression de l'administrateur",
					);
					return of({
						success: false,
						data: null,
					} as AdminDetailResponse);
				}),
				tap(() => this.deleting.set(false)),
			);
	}

	refreshAdmins() {
		this.getAdmins(this.currentPage()).subscribe();
	}

	setSearch(query: string) {
		this.search.set(query);
		this.currentPage.set(1);
	}

	setRoleFilter(role: AdminRoleType | "ALL") {
		this.roleFilter.set(role);
		this.currentPage.set(1);
	}

	setStatusFilter(status: UserStatus | "ALL") {
		this.statusFilter.set(status);
		this.currentPage.set(1);
	}

	adminRoleLabel(role: AdminRoleType | "ALL"): string {
		switch (role) {
			case "SUPER_ADMIN":
				return "Super Admin";
			case "FINANCE_ADMIN":
				return "Finance";
			case "MODERATION_ADMIN":
				return "Modération";
			case "SUPPORT_ADMIN":
				return "Support";
			default:
				return "Tous";
		}
	}

	getRoleBadgeVariant(role: AdminRoleType) {
		switch (role) {
			case "SUPER_ADMIN":
				return "bg-violet-50 text-violet-700";
			case "FINANCE_ADMIN":
				return "bg-emerald-50 text-emerald-700";
			case "MODERATION_ADMIN":
				return "bg-amber-50 text-amber-700";
			case "SUPPORT_ADMIN":
				return "bg-cyan-50 text-cyan-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	}
}
