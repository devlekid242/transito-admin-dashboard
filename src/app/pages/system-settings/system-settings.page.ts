import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { ModalComponent } from "../../shared/modal.component";
import {
	SystemSettingsService,
	SystemSettings,
} from "../../services/system-settings.service";

@Component({
	selector: "app-system-settings",
	imports: [CommonModule, PageHeaderComponent, ModalComponent],
	templateUrl: "system-settings.page.html",
})
export class SystemSettingsPage {
	private readonly settingsService = inject(SystemSettingsService);

	readonly activeTab = signal<
		"commission" | "payments" | "platform" | "security"
	>("commission");
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly lastError = signal<string | null>(null);
	readonly confirmSaveOpen = signal(false);
	readonly settings = signal<SystemSettings | null>(null);
	readonly draft = signal<SystemSettings | null>(null);

	readonly tabs = [
		{ id: "commission" as const, label: "Commission", icon: "fa-percent" },
		{ id: "payments" as const, label: "Paiements", icon: "fa-credit-card" },
		{ id: "platform" as const, label: "Plateforme", icon: "fa-globe" },
		{ id: "security" as const, label: "Sécurité", icon: "fa-lock" },
	];

	constructor() {
		this.loadSettings();
	}

	loadSettings() {
		this.loading.set(true);
		this.settingsService.getSettings().subscribe((response) => {
			if (response.success && response.data) {
				this.settings.set(response.data);
				this.draft.set(this.clone(response.data));
				this.lastError.set(null);
			} else {
				this.lastError.set(
					response.message ?? "Impossible de charger les paramètres.",
				);
			}
			this.loading.set(false);
		});
	}

	updateDraft<Key extends keyof SystemSettings>(
		key: Key,
		value: SystemSettings[Key],
	) {
		if (!this.draft()) {
			return;
		}
		this.draft.update((current) => ({
			...current!,
			[key]: value,
		}));
	}

	updateSecurity<Key extends keyof SystemSettings["security"]>(
		key: Key,
		value: SystemSettings["security"][Key],
	) {
		if (!this.draft()) {
			return;
		}

		this.draft.update((current) => ({
			...current!,
			security: {
				...current!.security,
				[key]: value,
			},
		}));
	}

	updatePasswordPolicy<
		Key extends keyof SystemSettings["security"]["passwordPolicy"],
	>(key: Key, value: SystemSettings["security"]["passwordPolicy"][Key]) {
		if (!this.draft()) {
			return;
		}

		this.draft.update((current) => ({
			...current!,
			security: {
				...current!.security,
				passwordPolicy: {
					...current!.security.passwordPolicy,
					[key]: value,
				},
			},
		}));
	}

	toggleMethod(name: string) {
		if (!this.draft()) {
			return;
		}

		this.draft.update((current) => ({
			...current!,
			paymentMethods: current!.paymentMethods.map((method) =>
				method.name === name
					? { ...method, enabled: !method.enabled }
					: method,
			),
		}));
	}

	get hasChanges() {
		return JSON.stringify(this.draft()) !== JSON.stringify(this.settings());
	}

	get hasCriticalChanges() {
		if (!this.draft() || !this.settings()) {
			return false;
		}

		return (
			this.draft()!.security.force2FA !==
				this.settings()!.security.force2FA ||
			this.draft()!.maintenanceMode !==
				this.settings()!.maintenanceMode ||
			this.draft()!.paymentMethods.some(
				(method, index) =>
					method.enabled !==
					this.settings()!.paymentMethods[index]?.enabled,
			)
		);
	}

	confirmSave() {
		this.confirmSaveOpen.set(true);
	}

	cancelSave() {
		this.confirmSaveOpen.set(false);
	}

	saveSettings() {
		const draft = this.draft();
		if (!draft) {
			return;
		}

		this.saving.set(true);
		this.settingsService.saveSettings(draft).subscribe((response) => {
			if (response.success && response.data) {
				this.settings.set(response.data);
				this.draft.set(this.clone(response.data));
				this.lastError.set(null);
			} else {
				this.lastError.set(
					response.message ??
						"Impossible de sauvegarder les paramètres.",
				);
			}
			this.saving.set(false);
			this.confirmSaveOpen.set(false);
		});
	}

	parseInteger(value: string, fallback = 0): number {
		const parsed = parseInt(value, 10);
		return Number.isNaN(parsed) ? fallback : parsed;
	}

	private clone(settings: SystemSettings): SystemSettings {
		return JSON.parse(JSON.stringify(settings));
	}

	formatCurrency(value: number) {
		return `${value.toLocaleString("fr-FR")} FCFA`;
	}
}
