import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, of, tap } from "rxjs";
import { environment } from "../../environments/environment";

export interface PaymentMethodSetting {
	name: string;
	enabled: boolean;
	icon: string;
}

export interface PasswordPolicy {
	minLength: number;
	requireUppercase: boolean;
	requireSpecialChar: boolean;
	expirationDays: number;
	historyCount: number;
}

export interface SecuritySettings {
	force2FA: boolean;
	autoLogoutMinutes: number;
	ipWhitelist: boolean;
	passwordPolicy: PasswordPolicy;
}

export interface SystemSettings {
	platformName: string;
	supportEmail: string;
	supportPhone: string;
	currency: string;
	platformFee: number;
	paymentMethods: PaymentMethodSetting[];
	security: SecuritySettings;
	maintenanceMode: boolean;
	maintenanceMessage: string;
	auditRetentionDays: number;
}

export interface SystemSettingsResponse {
	success: boolean;
	data: SystemSettings;
	message?: string;
}

@Injectable({
	providedIn: "root",
})
export class SystemSettingsService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	readonly settings = signal<SystemSettings | null>(null);
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly lastError = signal<string | null>(null);

	getSettings() {
		this.loading.set(true);
		this.lastError.set(null);

		return this.http
			.get<SystemSettingsResponse>(`${this.apiBaseUrl}/admin/settings`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.settings.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Failed to load system settings:", error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors du chargement des paramètres système.",
					);
					return of({
						success: false,
						data: this.defaultSettings,
					} as SystemSettingsResponse);
				}),
				tap(() => this.loading.set(false)),
			);
	}

	saveSettings(payload: Partial<SystemSettings>) {
		this.saving.set(true);
		this.lastError.set(null);

		return this.http
			.put<SystemSettingsResponse>(
				`${this.apiBaseUrl}/admin/settings`,
				payload,
			)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.settings.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Failed to save system settings:", error);
					this.lastError.set(
						error?.error?.message ??
							"Erreur lors de la sauvegarde des paramètres système.",
					);
					return of({
						success: false,
						data: this.defaultSettings,
					} as SystemSettingsResponse);
				}),
				tap(() => this.saving.set(false)),
			);
	}

	get defaultSettings(): SystemSettings {
		return {
			platformName: "Transito",
			supportEmail: "support@transito.cg",
			supportPhone: "+242 06 000 0000",
			currency: "FCFA",
			platformFee: 500,
			paymentMethods: [
				{ name: "Airtel Money", icon: "", enabled: true },
				{
					name: "MTN Mobile Money",
					icon: "",
					enabled: true,
				},
				{
					name: "Carte bancaire",
					icon: "fa-credit-card",
					enabled: false,
				},
			],
			security: {
				force2FA: true,
				autoLogoutMinutes: 30,
				ipWhitelist: false,
				passwordPolicy: {
					minLength: 8,
					requireUppercase: true,
					requireSpecialChar: true,
					expirationDays: 90,
					historyCount: 5,
				},
			},
			maintenanceMode: false,
			maintenanceMessage: "",
			auditRetentionDays: 90,
		};
	}
}
