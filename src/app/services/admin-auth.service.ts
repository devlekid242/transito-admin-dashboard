import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { BehaviorSubject, firstValueFrom, Observable, throwError } from "rxjs";
import { tap, catchError, finalize } from "rxjs/operators";
import { environment } from "../../environments/environment.prod";

export interface AdminUser {
	id: number;
	user: {
		id: number;
		fullName: string;
		email: string;
		phoneNumber: string;
		profilePhotoUrl?: string;
	};
	adminRole: string;
	status: string;
	permissions: string[];
	department?: string;
	lastLoginAt?: string;
	createdAt?: string;
}

export interface LoginResponse {
	token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	refresh_expires_at: string;
	user: {
		id: number;
		fullName: string;
		email: string;
		phoneNumber: string;
		roles: string[];
		profilePhotoUrl?: string;
		admin?: {
			adminRole: string;
			status: string;
			permissions: string[];
			department?: string;
		};
	};
}

const STORAGE_TOKEN_KEY = "admin_access_token";
const STORAGE_REFRESH_TOKEN_KEY = "admin_refresh_token";
const STORAGE_ADMIN_KEY = "admin_profile";

@Injectable({
	providedIn: "root",
})
export class AdminAuthService {
	private readonly apiBaseUrl = environment.apiUrl;
	private token: string | null = null;
	private refreshToken: string | null = null;
	private admin: AdminUser | null = null;
	private adminSubject = new BehaviorSubject<AdminUser | null>(null);
	public admin$ = this.adminSubject.asObservable();
	private loadingSubject = new BehaviorSubject<boolean>(false);
	public loading$ = this.loadingSubject.asObservable();

	constructor(
		private http: HttpClient,
		private router: Router,
	) {
		this.loadFromStorage();

		if (this.isAuthenticated()) {
			setTimeout(() => {
				this.refreshCurrentAdmin();
			}, 0);
		}
	}

	private loadFromStorage(): void {
		const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
		const storedRefreshToken = localStorage.getItem(
			STORAGE_REFRESH_TOKEN_KEY,
		);
		const storedAdmin = localStorage.getItem(STORAGE_ADMIN_KEY);

		if (storedToken) this.token = storedToken;
		if (storedRefreshToken) this.refreshToken = storedRefreshToken;

		if (storedAdmin) {
			try {
				this.admin = JSON.parse(storedAdmin);
				this.adminSubject.next(this.admin);
			} catch {
				this.admin = null;
			}
		}

		// Cohérence : si on a un token mais pas de profil admin valide, on nettoie tout
		if ((storedToken || storedRefreshToken) && !this.admin) {
			this.clearTokens();
		}
	}

	/**
	 * Login avec email/téléphone et mot de passe.
	 * Rejette explicitement les comptes qui n'ont pas de profil admin.
	 */
	login(identifier: string, password: string): Observable<LoginResponse> {
		this.loadingSubject.next(true);

		const isEmail = identifier.includes("@");
		const payload = isEmail
			? { email: identifier, password }
			: { phoneNumber: identifier, password };

		return this.http
			.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, payload)
			.pipe(
				tap((response) => {
					if (!response.user.admin) {
						throw new Error(
							"Ce compte n'a pas les droits d'administration.",
						);
					}
					this.persistTokens(response.token, response.refresh_token);
					this.admin = this.mapUserToAdmin(response.user);
					this.adminSubject.next(this.admin);
					this.persistAdmin(this.admin);
				}),
				catchError((error) => {
					console.error("Login error:", error);
					const message =
						error?.error?.message ??
						error?.message ??
						"Échec de connexion.";
					return throwError(() => new Error(message));
				}),
				finalize(() => this.loadingSubject.next(false)),
			);
	}

	getCurrentAdmin(): Observable<AdminUser> {
		return this.http
			.get<AdminUser>(`${this.apiBaseUrl}/admin/auth/me`)
			.pipe(
				tap((admin) => {
					this.admin = admin;
					this.adminSubject.next(admin);
					this.persistAdmin(admin);
				}),
				catchError((error) => {
					console.error("Get admin error:", error);
					return throwError(() => error);
				}),
			);
	}

	private refreshCurrentAdmin(): void {
		if (!this.isAuthenticated()) return;
		this.getCurrentAdmin().subscribe({
			error: (error) => {
				console.error("Error refreshing admin:", error);
				if (error.status === 401 || error.status === 403) {
					this.logout();
				}
			},
		});
	}

	getPermissions(): Observable<any> {
		return this.http.get(`${this.apiBaseUrl}/admin/auth/permissions`);
	}

	async refreshAccessToken(): Promise<string | null> {
		if (!this.refreshToken) return null;

		try {
			const response = await firstValueFrom(
				this.http.post<LoginResponse>(
					`${this.apiBaseUrl}/auth/refresh`,
					{
						refresh_token: this.refreshToken,
					},
				),
			);
			if (response?.token) {
				this.persistTokens(response.token, response.refresh_token);
				return response.token;
			}
			return null;
		} catch (error) {
			console.error("Token refresh error:", error);
			this.logout();
			return null;
		}
	}

	logout(): void {
		if (this.isAuthenticated()) {
			this.http
				.post(`${this.apiBaseUrl}/admin/auth/logout`, {})
				.subscribe({
					error: (error) => console.error("Logout error:", error),
					complete: () => this.clearTokens(),
				});
		}
		this.clearTokens();
	}

	private clearTokens(): void {
		localStorage.removeItem(STORAGE_TOKEN_KEY);
		localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
		localStorage.removeItem(STORAGE_ADMIN_KEY);

		this.token = null;
		this.refreshToken = null;
		this.admin = null;
		this.adminSubject.next(null);

		this.router.navigate(["/login"]);
	}

	// isAuthenticated() vérifie maintenant aussi la présence d'un profil admin
	isAuthenticated(): boolean {
		return (!!this.token || !!this.refreshToken) && !!this.admin;
	}

	getToken(): string | null {
		return this.token;
	}

	getRefreshToken(): string | null {
		return this.refreshToken;
	}

	getAdmin(): AdminUser | null {
		return this.admin;
	}

	hasPermission(permission: string): boolean {
		return this.admin?.permissions?.includes(permission) ?? false;
	}

	getAdminRole(): string | null {
		return this.admin?.adminRole ?? null;
	}

	private persistTokens(accessToken: string, refreshToken: string): void {
		this.token = accessToken;
		this.refreshToken = refreshToken;
		localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
		localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, refreshToken);
	}

	private persistAdmin(admin: AdminUser): void {
		localStorage.setItem(STORAGE_ADMIN_KEY, JSON.stringify(admin));
	}

	private mapUserToAdmin(user: any): AdminUser {
		const adminData = user.admin || {};
		return {
			id: user.id,
			user: {
				id: user.id,
				fullName: user.fullName,
				email: user.email,
				phoneNumber: user.phoneNumber,
				profilePhotoUrl: user.profilePhotoUrl,
			},
			adminRole: adminData.adminRole || "SUPPORT_ADMIN",
			status: adminData.status || "active",
			permissions: adminData.permissions || [],
			department: adminData.department,
		};
	}
}
