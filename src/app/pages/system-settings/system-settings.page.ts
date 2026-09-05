import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { ModalComponent } from "../../shared/modal.component";
import {
	SystemSettingsService,
	SystemSettings,
	MomoOperatorSetting,
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

	// --- CRUD opérateurs momo ---
	readonly newOperatorForm = signal<{
		id: string;
		name: string;
		collectionFeeRate: number;
		disbursementFeeRate: number;
	}>({ id: "", name: "", collectionFeeRate: 3, disbursementFeeRate: 3 });
	readonly newOperatorError = signal<string | null>(null);
	readonly showAddOperatorForm = signal(false);
	readonly pendingDeleteOperatorId = signal<string | null>(null);

	readonly tabs = [
		{ id: "commission" as const, label: "Commission", icon: "fa-percent" },
		{ id: "payments" as const, label: "Paiements", icon: "fa-credit-card" },
		{ id: "platform" as const, label: "Plateforme", icon: "fa-globe" },
		{ id: "security" as const, label: "Sécurité", icon: "fa-lock" },
	];

	constructor() {
		this.loadSettings();
	}

	private normalizeSettings(data: SystemSettings): SystemSettings {
		return {
			...data,
			momoOperators: data.momoOperators ?? [],
			paymentMethods: data.paymentMethods ?? [],
		};
	}

	loadSettings() {
		this.loading.set(true);
		this.settingsService.getSettings().subscribe((response) => {
			if (response.success && response.data) {
				const normalized = this.normalizeSettings(response.data);
				this.settings.set(normalized);
				this.draft.set(this.clone(normalized));
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

	// --- CRUD opérateurs momo (MTN, Airtel, ou tout nouvel opérateur) ---

	openAddOperatorForm() {
		this.newOperatorForm.set({
			id: "",
			name: "",
			collectionFeeRate: 3,
			disbursementFeeRate: 3,
		});
		this.newOperatorError.set(null);
		this.showAddOperatorForm.set(true);
	}

	cancelAddOperatorForm() {
		this.showAddOperatorForm.set(false);
		this.newOperatorError.set(null);
	}

	updateNewOperatorForm<
		Key extends keyof ReturnType<typeof this.newOperatorForm>,
	>(key: Key, value: ReturnType<typeof this.newOperatorForm>[Key]) {
		this.newOperatorForm.update((current) => ({ ...current, [key]: value }));
	}

	addMomoOperator() {
		const draft = this.draft();
		const form = this.newOperatorForm();
		if (!draft) {
			alert("Impossible d'ajouter un opérateur : aucun brouillon de paramètres.");
			return;
		}

		const id = form.id.trim().toUpperCase().replace(/\s+/g, "_");
		const name = form.name.trim();

		if (!id || !name) {
			this.newOperatorError.set(
				"L'identifiant et le nom de l'opérateur sont obligatoires.",
			);
			return;
		}
		if ((draft.momoOperators ?? []).some((op) => op.id === id)) {
			this.newOperatorError.set(
				`Un opérateur avec l'identifiant "${id}" existe déjà.`,
			);
			return;
		}
		if (
			form.collectionFeeRate < 0 ||
			form.collectionFeeRate > 100 ||
			form.disbursementFeeRate < 0 ||
			form.disbursementFeeRate > 100
		) {
			this.newOperatorError.set(
				"Les taux doivent être compris entre 0 et 100 %.",
			);
			return;
		}

		this.draft.update((current) => ({
			...current!,
			momoOperators: [
				...current!.momoOperators,
				{
					id,
					name,
					collectionFeeRate: form.collectionFeeRate,
					disbursementFeeRate: form.disbursementFeeRate,
					enabled: true,
				},
			],
		}));

		this.showAddOperatorForm.set(false);
		this.newOperatorError.set(null);
	}

	updateMomoOperator<Key extends keyof MomoOperatorSetting>(
		operatorId: string,
		key: Key,
		value: MomoOperatorSetting[Key],
	) {
		if (!this.draft()) {
			return;
		}

		this.draft.update((current) => ({
			...current!,
			momoOperators: current!.momoOperators.map((op) =>
				op.id === operatorId ? { ...op, [key]: value } : op,
			),
		}));
	}

	toggleMomoOperator(operatorId: string) {
		const operator = this.draft()?.momoOperators.find(
			(op) => op.id === operatorId,
		);
		if (!operator) {
			return;
		}
		this.updateMomoOperator(operatorId, "enabled", !operator.enabled);
	}

	confirmRemoveMomoOperator(operatorId: string) {
		this.pendingDeleteOperatorId.set(operatorId);
	}

	cancelRemoveMomoOperator() {
		this.pendingDeleteOperatorId.set(null);
	}

	removeMomoOperator(operatorId: string) {
		if (!this.draft()) {
			return;
		}

		this.draft.update((current) => ({
			...current!,
			momoOperators: current!.momoOperators.filter(
				(op) => op.id !== operatorId,
			),
		}));
		this.pendingDeleteOperatorId.set(null);
	}

	parseFloat2(value: string, fallback = 0): number {
		const parsed = parseFloat(value);
		return Number.isNaN(parsed) ? fallback : parsed;
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
			) ||
			JSON.stringify(this.draft()!.momoOperators) !==
				JSON.stringify(this.settings()!.momoOperators)
		);
	}

	get momoOperatorsChanged() {
		if (!this.draft() || !this.settings()) {
			return false;
		}
		return (
			JSON.stringify(this.draft()!.momoOperators) !==
			JSON.stringify(this.settings()!.momoOperators)
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
			this.saving.set(false);
			if (response.success && response.data) {
				const normalized = this.normalizeSettings(response.data);
				this.settings.set(normalized);
				this.draft.set(this.clone(normalized));
				this.lastError.set(null);
				this.confirmSaveOpen.set(false);
			} else {
				this.lastError.set(
					response.message ??
						"Impossible de sauvegarder les paramètres.",
				);
				// La modale reste ouverte : on affiche l'erreur dedans
				// plutôt que de la fermer comme si tout s'était bien passé.
			}
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