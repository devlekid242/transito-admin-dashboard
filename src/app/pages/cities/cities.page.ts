import {
	Component,
	DestroyRef,
	computed,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpEventType } from "@angular/common/http";
import {
	City,
	CityCreateInput,
	CityService,
	CitySiteVisibilityInput,
	CityUpdateInput,
} from "../../services/city.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { StatusBadgeComponent } from "../../shared/status-badge.component";
import {
	DataTableColumn,
	DataTableComponent,
} from "../../shared/data-table.component";
import { ModalComponent } from "../../shared/modal.component";
import { environment } from "../../../environments/environment";

interface CityFormModel {
	name: string;
	code: string;
	country: string;
	isActive: boolean;
	showOnSite: boolean;
	siteDisplayOrder: number | null;
}

const EMPTY_FORM: CityFormModel = {
	name: "",
	code: "",
	country: "Congo",
	isActive: true,
	showOnSite: false,
	siteDisplayOrder: null,
};

@Component({
	selector: "app-cities",
	imports: [
		CommonModule,
		FormsModule,
		PageHeaderComponent,
		StatusBadgeComponent,
		DataTableComponent,
		ModalComponent,
	],
	templateUrl: "cities.page.html",
})
export class CitiesPage {
	readonly cityService = inject(CityService);
	private readonly destroyRef = inject(DestroyRef);

	readonly columns: DataTableColumn[] = [
		{ key: "name", label: "Ville", align: "left" },
		{ key: "code", label: "Code", align: "center" },
		{ key: "country", label: "Pays", align: "left" },
		{ key: "status", label: "Statut", align: "center" },
		{ key: "siteImage", label: "Image", align: "center" },
		{ key: "siteVisibility", label: "Affichée sur le site", align: "center" },
		{ key: "tripsCount", label: "Trajets", align: "center" },
		{ key: "boardingPointsCount", label: "Points d'embarquement", align: "center" },
		{ key: "actions", label: "Actions", align: "right" },
	];

	readonly cities = this.cityService.cities;
	readonly loading = this.cityService.loadingCities;
	readonly privateImageUrls = signal<Record<number, string>>({});
	readonly privateImagePreviewErrors = signal<Record<number, boolean>>({});
	readonly filteredCities = computed(() => {
		const query = this.cityService.searchQuery().trim().toLocaleLowerCase();
		const status = this.cityService.statusFilter();
		const visibility = this.cityService.siteVisibilityFilter();
		return this.cities().filter((city) => {
			const matchesQuery =
				!query ||
				`${city.name} ${city.code ?? ""} ${city.country ?? ""}`
					.toLocaleLowerCase()
					.includes(query);
			const matchesStatus =
				status === null ||
				(status === "active" ? city.isActive : !city.isActive);
			const matchesVisibility =
				visibility === null ||
				(visibility === "shown"
					? city.isActive && city.showOnSite
					: !city.isActive || !city.showOnSite);
			return matchesQuery && matchesStatus && matchesVisibility;
		});
	});
	readonly totalCities = computed(() => this.cities().length);
	readonly activeCitiesCount = computed(
		() => this.cities().filter((city) => city.isActive).length,
	);
	readonly inactiveCitiesCount = computed(
		() => this.cities().filter((city) => !city.isActive).length,
	);
	readonly shownOnSiteCount = computed(
		() =>
			this.cities().filter((city) => city.isActive && city.showOnSite)
				.length,
	);

	readonly showFormModal = signal(false);
	readonly formMode = signal<"create" | "edit">("create");
	readonly editingCity = signal<City | null>(null);
	readonly formSaving = signal(false);
	readonly formError = signal<string | null>(null);
	readonly formFieldErrors = signal<Record<string, string>>({});
	form: CityFormModel = { ...EMPTY_FORM };

	readonly showDeleteModal = signal(false);
	readonly cityToDelete = signal<City | null>(null);
	readonly deleteError = signal<string | null>(null);
	readonly deleting = signal(false);

	readonly pendingVisibilityCity = signal<City | null>(null);
	readonly showVisibilityConfirm = signal(false);
	readonly visibilitySaving = signal(false);
	readonly visibilityError = signal<string | null>(null);

	readonly showImageDeleteConfirm = signal(false);
	readonly imageDeleteError = signal<string | null>(null);
	readonly imageDeleting = signal(false);
	readonly selectedImage = signal<File | null>(null);
	readonly localImagePreview = signal<string | null>(null);
	readonly imageError = signal<string | null>(null);
	readonly imageUploadProgress = this.cityService.uploadProgress;
	readonly imageFieldError = signal<string | null>(null);
	readonly imageUploading = signal(false);

	readonly showOrganizerModal = signal(false);
	readonly organizerCities = signal<City[]>([]);
	readonly organizerSaving = signal(false);
	readonly organizerError = signal<string | null>(null);
	readonly siteNotice =
		"Les changements apparaissent sur le site sous quelques minutes (cache public).";

	constructor() {
		this.destroyRef.onDestroy(() => this.revokePrivateImageUrls());
		this.loadData();
	}

	loadData(): void {
		this.visibilityError.set(null);
		this.cityService.getCities().subscribe({
			next: (response) => {
				if (!response.success) {
					this.visibilityError.set(
						response.message ?? "Impossible de charger les villes.",
					);
					return;
				}
				this.loadPrivateImagePreviews(response.data);
			},
			error: () => {
				this.visibilityError.set("Impossible de charger les villes.");
			},
		});
	}

	onSearch(value: string): void {
		this.cityService.setSearchQuery(value);
	}

	onStatusFilter(value: string): void {
		this.cityService.setStatusFilter(
			value === "active" || value === "inactive" ? value : null,
		);
	}

	onSiteVisibilityFilter(value: string): void {
		this.cityService.siteVisibilityFilter.set(
			value === "shown" || value === "hidden" ? value : null,
		);
	}

	refresh(): void {
		this.loadData();
	}

	openCreateModal(): void {
		this.formMode.set("create");
		this.editingCity.set(null);
		this.form = { ...EMPTY_FORM };
		this.resetFormErrors();
		this.clearSelectedImage();
		this.showFormModal.set(true);
	}

	openEditModal(city: City): void {
		this.formMode.set("edit");
		this.editingCity.set(city);
		this.form = {
			name: city.name,
			code: city.code ?? "",
			country: city.country ?? "",
			isActive: city.isActive,
			showOnSite: city.showOnSite,
			siteDisplayOrder: city.siteDisplayOrder,
		};
		this.resetFormErrors();
		this.clearSelectedImage();
		this.showFormModal.set(true);
	}

	closeFormModal(): void {
		this.showFormModal.set(false);
		this.editingCity.set(null);
		this.resetFormErrors();
		this.clearSelectedImage();
	}

	saveCity(): void {
		const name = this.form.name.trim();
		if (!name) {
			this.formError.set("Le nom de la ville est obligatoire.");
			return;
		}
		if (
			this.form.siteDisplayOrder !== null &&
			(!Number.isInteger(this.form.siteDisplayOrder) ||
				this.form.siteDisplayOrder < 0)
		) {
			this.formFieldErrors.set({
				siteDisplayOrder: "L'ordre doit être un entier supérieur ou égal à 0.",
			});
			return;
		}

		this.formSaving.set(true);
		this.resetFormErrors();
		const payload: CityCreateInput | CityUpdateInput = {
			name,
			code: this.form.code.trim() || null,
			country: this.form.country.trim() || null,
			isActive: this.form.isActive,
			showOnSite: this.form.showOnSite,
			siteDisplayOrder: this.form.siteDisplayOrder,
		};
		const editing = this.editingCity();
		const request =
			this.formMode() === "edit" && editing
				? this.cityService.updateCity(editing.id, payload)
				: this.cityService.createCity(payload as CityCreateInput);

		request.subscribe({
			next: (response) => {
				this.formSaving.set(false);
				if (!response.success || !response.data) {
					this.setFormApiError(response);
					return;
				}
				if (this.formMode() === "create") {
					this.formMode.set("edit");
					this.editingCity.set(response.data);
					this.loadPrivateImagePreviews([response.data], false);
					this.formError.set(
						"Ville enregistrée. Vous pouvez maintenant ajouter son image.",
					);
					return;
				}
				this.closeFormModal();
			},
			error: (error) => {
				this.formSaving.set(false);
				this.setFormApiError(error);
			},
		});
	}

	requestVisibilityToggle(city: City): void {
		if (!city.isActive || this.visibilitySaving()) return;
		if (city.showOnSite) {
			this.pendingVisibilityCity.set(city);
			this.visibilityError.set(null);
			this.showVisibilityConfirm.set(true);
			return;
		}
		this.saveVisibility(city, true);
	}

	confirmHideFromSite(): void {
		const city = this.pendingVisibilityCity();
		if (city) this.saveVisibility(city, false);
	}

	private saveVisibility(city: City, showOnSite: boolean): void {
		this.visibilitySaving.set(true);
		this.visibilityError.set(null);
		const item: CitySiteVisibilityInput = {
			id: city.id,
			showOnSite,
			siteDisplayOrder: city.siteDisplayOrder,
		};
		this.cityService.updateSiteVisibility([item]).subscribe({
			next: (response) => {
				this.visibilitySaving.set(false);
				if (!response.success) {
					this.visibilityError.set(
						response.message ?? "La visibilité n'a pas été modifiée.",
					);
					return;
				}
				this.showVisibilityConfirm.set(false);
				this.pendingVisibilityCity.set(null);
				this.loadData();
			},
			error: (error) => {
				this.visibilitySaving.set(false);
				this.visibilityError.set(this.apiErrorMessage(error));
			},
		});
	}

	openOrganizer(): void {
		this.organizerCities.set(
			this.cities()
				.filter((city) => city.isActive && city.showOnSite)
				.sort(
					(a, b) =>
						(a.siteDisplayOrder ?? Number.MAX_SAFE_INTEGER) -
							(b.siteDisplayOrder ?? Number.MAX_SAFE_INTEGER) ||
						a.name.localeCompare(b.name) ||
						a.id - b.id,
				),
		);
		this.organizerError.set(null);
		this.showOrganizerModal.set(true);
	}

	moveOrganizedCity(index: number, offset: -1 | 1): void {
		const cities = [...this.organizerCities()];
		const target = index + offset;
		if (target < 0 || target >= cities.length) return;
		[cities[index], cities[target]] = [cities[target], cities[index]];
		this.organizerCities.set(cities);
	}

	saveOrganizerOrder(): void {
		if (this.organizerCities().length > 100) {
			this.organizerError.set(
				"Le réordonnancement ne peut contenir plus de 100 villes.",
			);
			return;
		}
		this.organizerSaving.set(true);
		this.organizerError.set(null);
		const items = this.organizerCities().map((city, index) => ({
			id: city.id,
			showOnSite: true,
			siteDisplayOrder: index,
		}));
		this.cityService.updateSiteVisibility(items).subscribe({
			next: (response) => {
				this.organizerSaving.set(false);
				if (!response.success) {
					this.organizerError.set(
						response.message ?? "L'ordre des villes n'a pas été enregistré.",
					);
					return;
				}
				this.showOrganizerModal.set(false);
				this.loadData();
			},
			error: (error) => {
				this.organizerSaving.set(false);
				this.organizerError.set(this.apiErrorMessage(error));
			},
		});
	}

	onImageSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		this.clearSelectedImage();
		this.imageError.set(null);
		this.imageFieldError.set(null);
		if (!file) return;
		if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
			this.imageFieldError.set("Sélectionnez une image JPEG, PNG ou WebP.");
			input.value = "";
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			this.imageFieldError.set("La taille maximale autorisée est de 5 Mo.");
			input.value = "";
			return;
		}
		this.selectedImage.set(file);
		this.localImagePreview.set(URL.createObjectURL(file));
		input.value = "";
	}

	uploadSelectedImage(): void {
		const city = this.editingCity();
		const file = this.selectedImage();
		if (!city || !file || this.imageUploading()) return;
		this.imageUploading.set(true);
		this.imageError.set(null);
		this.imageFieldError.set(null);
		this.cityService.uploadCityImage(city.id, file).subscribe({
			next: (event) => {
				if (event.type !== HttpEventType.Response) return;
				this.imageUploading.set(false);
				if (!event.body?.success || !event.body.data) {
					this.setImageApiError(event.body);
					return;
				}
				this.editingCity.set(event.body.data);
				this.clearSelectedImage();
				this.loadData();
			},
			error: (error) => {
				this.imageUploading.set(false);
				this.setImageApiError(error);
			},
		});
	}

	confirmDeleteImage(): void {
		this.showImageDeleteConfirm.set(true);
		this.imageDeleteError.set(null);
	}

	toggleStatus(city: City): void {
		this.cityService.toggleCityStatus(city.id).subscribe({
			next: (response) => {
				if (!response.success) {
					this.visibilityError.set(
						response.message ?? "Impossible de modifier le statut.",
					);
					return;
				}
				this.loadData();
			},
			error: (error) => this.visibilityError.set(this.apiErrorMessage(error)),
		});
	}

	confirmDelete(city: City): void {
		this.cityToDelete.set(city);
		this.deleteError.set(null);
		this.showDeleteModal.set(true);
	}

	cancelDelete(): void {
		this.showDeleteModal.set(false);
		this.cityToDelete.set(null);
		this.deleteError.set(null);
	}

	deleteCity(): void {
		const city = this.cityToDelete();
		if (!city || this.deleting()) return;
		this.deleting.set(true);
		this.deleteError.set(null);
		this.cityService.deleteCity(city.id).subscribe({
			next: (response) => {
				this.deleting.set(false);
				if (!response.success) {
					this.deleteError.set(
						response.message ?? "Impossible de supprimer cette ville.",
					);
					return;
				}
				this.revokePrivateImageUrl(city.id);
				this.cancelDelete();
			},
			error: (error) => {
				this.deleting.set(false);
				this.deleteError.set(this.apiErrorMessage(error));
			},
		});
	}

	deleteImage(): void {
		const city = this.editingCity();
		if (!city || this.imageDeleting()) return;
		this.imageDeleting.set(true);
		this.imageDeleteError.set(null);
		this.cityService.deleteCityImage(city.id).subscribe({
			next: (response) => {
				this.imageDeleting.set(false);
				if (!response.success || !response.data) {
					this.imageDeleteError.set(
						response.message ?? "Impossible de supprimer l'image.",
					);
					return;
				}
				this.editingCity.set(response.data);
				this.showImageDeleteConfirm.set(false);
				this.revokePrivateImageUrl(city.id);
			},
			error: (error) => {
				this.imageDeleting.set(false);
				this.imageDeleteError.set(this.apiErrorMessage(error));
			},
		});
	}

	imageUrl(city: City): string | null {
		if (!city.hasImage) return null;
		if (city.isActive && city.showOnSite && city.imagePreviewUrl) {
			return `${environment.baseApiUrl.replace(/\/$/, "")}${city.imagePreviewUrl}`;
		}
		return this.privateImageUrls()[city.id] ?? null;
	}

	editingImageUrl(): string | null {
		const city = this.editingCity();
		return city ? this.imageUrl(city) : null;
	}

	getStatusBadgeVariant(isActive: boolean): "active" | "suspended" {
		return isActive ? "active" : "suspended";
	}

	getStatusText(isActive: boolean): string {
		return isActive ? "Active" : "Inactive";
	}

	formatDate(dateString: string): string {
		return this.cityService.formatDate(dateString);
	}

	private loadPrivateImagePreviews(cities: City[], reset = true): void {
		if (reset) this.revokePrivateImageUrls();
		for (const city of cities) {
			if (!city.hasImage || (city.isActive && city.showOnSite)) continue;
			this.cityService.getCityImagePreview(city.id).subscribe({
				next: (blob) => {
					this.revokePrivateImageUrl(city.id);
					const url = URL.createObjectURL(blob);
					this.privateImageUrls.update((urls) => ({
						...urls,
						[city.id]: url,
					}));
					this.clearImagePreviewError(city.id);
				},
				error: () => {
					this.markImagePreviewUnavailable(city.id);
				},
			});
		}
	}

	markImagePreviewUnavailable(id: number): void {
		this.privateImagePreviewErrors.update((errors) => ({
			...errors,
			[id]: true,
		}));
	}

	clearImagePreviewError(id: number): void {
		this.privateImagePreviewErrors.update((errors) => {
			const next = { ...errors };
			delete next[id];
			return next;
		});
	}

	private revokePrivateImageUrls(): void {
		for (const url of Object.values(this.privateImageUrls())) {
			URL.revokeObjectURL(url);
		}
		this.privateImageUrls.set({});
		this.privateImagePreviewErrors.set({});
	}

	private revokePrivateImageUrl(id: number): void {
		const urls = this.privateImageUrls();
		if (urls[id]) URL.revokeObjectURL(urls[id]);
		this.privateImageUrls.update((current) => {
			const next = { ...current };
			delete next[id];
			return next;
		});
	}

	private clearSelectedImage(): void {
		const preview = this.localImagePreview();
		if (preview) URL.revokeObjectURL(preview);
		this.localImagePreview.set(null);
		this.selectedImage.set(null);
	}

	private resetFormErrors(): void {
		this.formError.set(null);
		this.formFieldErrors.set({});
		this.imageError.set(null);
		this.imageFieldError.set(null);
	}

	private setFormApiError(error: unknown): void {
		const body = this.responseBody(error);
		this.formFieldErrors.set(this.flattenFieldErrors(body?.errors));
		this.formError.set(
			body?.message ?? "Une erreur est survenue lors de l'enregistrement.",
		);
	}

	private setImageApiError(error: unknown): void {
		const body = this.responseBody(error);
		const errors = this.flattenFieldErrors(body?.errors);
		this.imageFieldError.set(errors["image"] ?? null);
		this.imageError.set(
			body?.message ?? errors["image"] ?? "L'image n'a pas pu être envoyée.",
		);
	}

	private apiErrorMessage(error: unknown): string {
		const body = this.responseBody(error);
		const firstFieldError = body?.errors
			? Object.values(body.errors).flat()[0]
			: undefined;
		return (
			body?.message ??
			firstFieldError ??
			"Une erreur est survenue. Veuillez réessayer."
		);
	}

	private responseBody(
		error: unknown,
	): { message?: string; errors?: Record<string, string[]> } | null {
		if (typeof error !== "object" || error === null || !("error" in error)) {
			return null;
		}
		const body = error.error;
		return typeof body === "object" && body !== null ? body : null;
	}

	private flattenFieldErrors(
		errors: Record<string, string[]> | undefined,
	): Record<string, string> {
		if (!errors) return {};
		return Object.fromEntries(
			Object.entries(errors).map(([field, messages]) => [
				field,
				messages[0] ?? "Valeur invalide.",
			]),
		);
	}
}
