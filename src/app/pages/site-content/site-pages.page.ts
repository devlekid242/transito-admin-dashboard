import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { SiteContentService, SitePage, SitePageSlug, SitePageWrite, SitePublicationStatus } from "../../services/site-content.service";
import { AlertService } from "../../services/alert.service";
import { DataTableColumn, DataTableComponent } from "../../shared/data-table.component";
import { ModalComponent } from "../../shared/modal.component";
import { PageHeaderComponent } from "../../shared/page-header.component";

const PAGE_SLUGS: { value: SitePageSlug; label: string }[] = [
	{ value: "home", label: "Accueil" },
	{ value: "agences", label: "Agences" },
	{ value: "contact", label: "Contact" },
	{ value: "confidentialite", label: "Confidentialité" },
];

const EMPTY_PAGE: SitePageWrite = {
	slug: "home",
	title: "",
	metaTitle: "",
	metaDescription: "",
};

@Component({
	selector: "app-site-pages",
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, DataTableComponent, ModalComponent, PageHeaderComponent],
	templateUrl: "./site-pages.page.html",
})
export class SitePagesPage implements OnInit {
	private readonly service = inject(SiteContentService);
	private readonly alerts = inject(AlertService);

	readonly pages = signal<SitePage[]>([]);
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly fieldErrors = signal<Record<string, string[]>>({});
	readonly modalOpen = signal(false);
	readonly creating = signal(false);
	readonly editingPage = signal<SitePage | null>(null);
	readonly form = signal<SitePageWrite>({ ...EMPTY_PAGE });
	readonly slugs = PAGE_SLUGS;
	readonly columns: DataTableColumn[] = [
		{ key: "slug", label: "Page" },
		{ key: "title", label: "Titre" },
		{ key: "status", label: "Statut" },
		{ key: "updatedAt", label: "Dernière modification" },
		{ key: "updatedByName", label: "Auteur" },
		{ key: "actions", label: "Actions", align: "right" },
	];

	ngOnInit(): void {
		this.loadPages();
	}

	loadPages(): void {
		this.loading.set(true);
		this.errorMessage.set(null);
		this.service.listPages().subscribe({
			next: (response) => this.pages.set(response.data),
			error: (error: unknown) => {
				this.loading.set(false);
				this.errorMessage.set(this.errorMessageFor(error, "Impossible de charger les pages."));
				this.pages.set([]);
			},
			complete: () => this.loading.set(false),
		});
	}

	openCreate(): void {
		this.creating.set(true);
		this.editingPage.set(null);
		this.form.set({ ...EMPTY_PAGE });
		this.fieldErrors.set({});
		this.errorMessage.set(null);
		this.modalOpen.set(true);
	}

	openEdit(page: SitePage): void {
		this.creating.set(false);
		this.editingPage.set(page);
		this.form.set({
			slug: page.slug,
			title: page.title,
			metaTitle: page.metaTitle ?? "",
			metaDescription: page.metaDescription ?? "",
		});
		this.fieldErrors.set({});
		this.errorMessage.set(null);
		this.modalOpen.set(true);
	}

	closeModal(): void {
		this.modalOpen.set(false);
		this.fieldErrors.set({});
	}

	updateForm<K extends keyof SitePageWrite>(key: K, value: SitePageWrite[K]): void {
		this.form.update((current) => ({ ...current, [key]: value }));
		this.fieldErrors.update((errors) => {
			const next = { ...errors };
			delete next[key];
			return next;
		});
	}

	fieldError(key: string): string | null {
		return this.fieldErrors()[key]?.join(" ") ?? null;
	}

	save(): void {
		const form = this.form();
		const errors: Record<string, string[]> = {};
		if (!form.title.trim()) errors["title"] = ["Le titre est obligatoire."];
		if (form.title.length > 255) errors["title"] = ["Le titre est limité à 255 caractères."];
		if ((form.metaTitle?.length ?? 0) > 70) errors["metaTitle"] = ["70 caractères maximum."];
		if ((form.metaDescription?.length ?? 0) > 160) errors["metaDescription"] = ["160 caractères maximum."];
		for (const key of ["title", "metaTitle", "metaDescription"] as const) {
			const value = form[key];
			if (typeof value === "string" && (value.includes("<") || value.includes(">"))) {
				errors[key] = ["Le HTML n’est pas autorisé."];
			}
		}
		if (Object.keys(errors).length) {
			this.fieldErrors.set(errors);
			return;
		}
		this.saving.set(true);
		this.fieldErrors.set({});
		const request = this.creating()
			? this.service.createPage(form)
			: this.service.updatePage(this.editingPage()!.id, form);
		request.subscribe({
			next: () => {
				this.closeModal();
				this.loadPages();
				this.alerts.success(this.creating() ? "La page a été créée en brouillon." : "La page a été mise à jour.");
			},
			error: (error: unknown) => {
				this.saving.set(false);
				this.handleApiError(error);
			},
			complete: () => this.saving.set(false),
		});
	}

	async togglePublication(page: SitePage): Promise<void> {
		const nextStatus: SitePublicationStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
		const action = nextStatus === "PUBLISHED" ? "publier" : "dépublier";
		if (!(await this.alerts.confirm(`${action[0].toUpperCase()}${action.slice(1)} cette page ?`, "Le site public sera mis à jour."))) return;
		this.service.setPageStatus(page.id, nextStatus).subscribe({
			next: () => {
				this.alerts.success(nextStatus === "PUBLISHED" ? "La page a été publiée." : "La page a été dépubliée.");
				this.loadPages();
			},
			error: (error: unknown) => this.alerts.apiError(error, "Impossible de modifier la publication."),
		});
	}

	async deletePage(page: SitePage): Promise<void> {
		if (!(await this.alerts.confirm("Supprimer cette page ?", "Ses blocs associés seront également supprimés."))) return;
		this.service.deletePage(page.id).subscribe({
			next: () => {
				this.alerts.success("La page a été supprimée.");
				this.loadPages();
			},
			error: (error: unknown) => this.alerts.apiError(error, "Impossible de supprimer la page."),
		});
	}

	tableRows(): (SitePage & { updatedByName: string })[] {
		return this.pages().map((page) => ({ ...page, updatedByName: page.updatedBy?.name ?? "—" }));
	}

	statusLabel(status: SitePublicationStatus): string {
		return status === "PUBLISHED" ? "Publié" : "Brouillon";
	}

	private handleApiError(error: unknown): void {
		if (error instanceof HttpErrorResponse && error.status === 422 && isRecord(error.error) && isRecord(error.error["errors"])) {
			this.fieldErrors.set(error.error["errors"] as Record<string, string[]>);
			this.errorMessage.set("Vérifiez les champs indiqués.");
			return;
		}
		this.errorMessage.set(this.errorMessageFor(error, "Impossible d’enregistrer la page."));
	}

	private errorMessageFor(error: unknown, fallback: string): string {
		return this.alerts.getApiErrorMessage(error, fallback);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
