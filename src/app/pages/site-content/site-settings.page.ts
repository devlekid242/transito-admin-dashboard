import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { AlertService } from "../../services/alert.service";
import { SiteContentService, SiteSetting, SiteSettingKey } from "../../services/site-content.service";
import { ModalComponent } from "../../shared/modal.component";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { SITE_SETTING_FIELDS, validateSetting } from "./site-content.forms";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-site-settings",
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, ModalComponent, PageHeaderComponent],
	templateUrl: "./site-settings.page.html",
})
export class SiteSettingsPage implements OnInit {
	private readonly service = inject(SiteContentService);
	private readonly alerts = inject(AlertService);

	readonly fields = SITE_SETTING_FIELDS;
	readonly values = signal<Record<string, string>>({});
	readonly savedValues = signal<Record<string, string>>({});
	readonly serverErrors = signal<Record<string, string[]>>({});
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly modalOpen = signal(false);
	readonly removingKey = signal<SiteSettingKey | null>(null);

	ngOnInit(): void {
		this.loadSettings();
	}

	loadSettings(): void {
		this.loading.set(true);
		this.errorMessage.set(null);
		this.service.listSettings().subscribe({
			next: (response) => {
				const values = Object.fromEntries(response.data.map((setting) => [setting.key, setting.value]));
				this.values.set(values);
				this.savedValues.set({ ...values });
			},
			error: (error: unknown) => {
				this.loading.set(false);
				this.errorMessage.set(this.alerts.getApiErrorMessage(error, "Impossible de charger les paramètres."));
			},
			complete: () => this.loading.set(false),
		});
	}

	value(key: SiteSettingKey): string {
		return this.values()[key] ?? "";
	}

	updateValue(key: SiteSettingKey, value: string): void {
		this.values.update((current) => ({ ...current, [key]: value }));
		this.serverErrors.update((current) => {
			const next = { ...current };
			delete next[key];
			return next;
		});
	}

	fieldError(key: SiteSettingKey): string | null {
		if (this.serverErrors()[key]?.length) return this.serverErrors()[key].join(" ");
		const value = this.value(key);
		if (!value.trim()) return null;
		return validateSetting(key, value);
	}

	save(): void {
		const changed = this.fields.filter(({ key }) => this.value(key).trim() && this.value(key) !== (this.savedValues()[key] ?? ""));
		const errors: Record<string, string[]> = {};
		for (const field of this.fields) {
			if (!this.value(field.key).trim()) continue;
			const validation = validateSetting(field.key, this.value(field.key));
			if (validation) errors[field.key] = [validation];
		}
		this.serverErrors.set(errors);
		if (Object.keys(errors).length) return;
		if (!changed.length) {
			this.alerts.info("Aucun paramètre modifié.");
			return;
		}

		this.saving.set(true);
		this.errorMessage.set(null);
		forkJoin(changed.map(({ key }) => this.service.updateSetting(key, this.value(key)))).subscribe({
			next: () => {
				this.savedValues.set({ ...this.values() });
				this.alerts.success("Les paramètres du site ont été enregistrés.");
			},
			error: (error: unknown) => {
				this.saving.set(false);
				this.handleApiError(error);
			},
			complete: () => this.saving.set(false),
		});
	}

	async confirmRemove(key: SiteSettingKey): Promise<void> {
		if (!this.savedValues()[key]) return;
		if (!(await this.alerts.confirm("Retirer ce paramètre public ?", "La valeur sera supprimée du site vitrine."))) return;
		this.removingKey.set(key);
		this.service.deleteSetting(key).subscribe({
			next: () => {
				this.values.update((values) => {
					const next = { ...values };
					delete next[key];
					return next;
				});
				this.savedValues.update((values) => {
					const next = { ...values };
					delete next[key];
					return next;
				});
				this.alerts.success("Le paramètre a été supprimé.");
			},
			error: (error: unknown) => this.alerts.apiError(error, "Impossible de supprimer ce paramètre."),
			complete: () => this.removingKey.set(null),
		});
	}

	showPreview(): void {
		this.modalOpen.set(true);
	}

	closePreview(): void {
		this.modalOpen.set(false);
	}

	private handleApiError(error: unknown): void {
		if (error instanceof HttpErrorResponse && error.status === 422 && isRecord(error.error) && isRecord(error.error["errors"])) {
			const errors = error.error["errors"] as Record<string, string[]>;
			if (errors["value"]) {
				const key = error.url?.match(/\/settings\/([a-z_]+)$/)?.[1];
				if (key) {
					this.serverErrors.set({ [key]: errors["value"] });
					this.errorMessage.set("Vérifiez le paramètre indiqué.");
				} else {
					this.errorMessage.set(errors["value"].join(" "));
				}
			} else {
				this.serverErrors.set(errors);
				this.errorMessage.set("Vérifiez les paramètres indiqués.");
			}
			return;
		}
		this.errorMessage.set(this.alerts.getApiErrorMessage(error, "Impossible d’enregistrer les paramètres."));
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
