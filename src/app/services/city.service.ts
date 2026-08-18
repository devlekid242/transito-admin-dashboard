import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { catchError, of, tap } from "rxjs";

// Interfaces for City Management
export interface City {
	id: number;
	name: string;
	code: string | null;
	country: string | null;
	isActive: boolean;
	tripsCount?: number;
	boardingPointsCount?: number;
	createdAt: string;
}

export interface CityCreateInput {
	name: string;
	code?: string | null;
	country?: string | null;
	isActive?: boolean;
}

export interface CityUpdateInput {
	name?: string;
	code?: string | null;
	country?: string | null;
	isActive?: boolean;
}

export interface CityListResponse {
	success: boolean;
	data: City[];
}

export interface CityDetailResponse {
	success: boolean;
	data: City;
}

export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

@Injectable({
	providedIn: "root",
})
export class CityService {
	private readonly apiBaseUrl = environment.apiUrl;
	private readonly http = inject(HttpClient);

	// Signals for reactive state management
	readonly cities = signal<City[]>([]);
	readonly currentCity = signal<City | null>(null);

	// Loading states
	readonly loadingCities = signal<boolean>(false);
	readonly loadingCity = signal<boolean>(false);

	// Search and filter state
	readonly searchQuery = signal<string>("");
	readonly statusFilter = signal<"active" | "inactive" | null>(null);

	// Computed signals
	readonly totalCities = computed(() => this.cities().length);
	readonly activeCitiesCount = computed(
		() => this.cities().filter((c) => c.isActive).length,
	);
	readonly inactiveCitiesCount = computed(
		() => this.cities().filter((c) => !c.isActive).length,
	);

	/**
	 * Get all cities with optional search and status filter.
	 */
	getCities(search?: string, status?: "active" | "inactive" | null) {
		this.loadingCities.set(true);

		let params = new HttpParams();
		if (search) {
			params = params.set("search", search);
		}
		if (status) {
			params = params.set("status", status);
		}

		return this.http
			.get<CityListResponse>(`${this.apiBaseUrl}/admin/cities`, {
				params,
			})
			.pipe(
				tap((response) => {
					if (response.success) {
						this.cities.set(response.data);
					}
				}),
				catchError((error) => {
					console.error("Error fetching cities:", error);
					return of({
						success: false,
						message: "Erreur lors de la récupération des villes",
						data: [] as City[],
					});
				}),
				tap(() => this.loadingCities.set(false)),
			);
	}

	/**
	 * Get a single city by ID.
	 */
	getCity(id: number) {
		this.loadingCity.set(true);

		return this.http
			.get<CityDetailResponse>(`${this.apiBaseUrl}/admin/cities/${id}`)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						this.currentCity.set(response.data);
					}
				}),
				catchError((error) => {
					console.error(`Error fetching city ${id}:`, error);
					return of({
						success: false,
						message: "Ville introuvable",
						data: null as unknown as City,
					});
				}),
				tap(() => this.loadingCity.set(false)),
			);
	}

	/**
	 * Create a new city.
	 */
	createCity(input: CityCreateInput) {
		return this.http
			.post<ApiResponse<City>>(`${this.apiBaseUrl}/admin/cities`, input)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const created = response.data;
						this.cities.update((cities) =>
							[...cities, created].sort((a, b) =>
								a.name.localeCompare(b.name),
							),
						);
					}
				}),
				catchError((error) => {
					console.error("Error creating city:", error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la création de la ville",
					});
				}),
			);
	}

	/**
	 * Update a city.
	 */
	updateCity(id: number, input: CityUpdateInput) {
		return this.http
			.put<ApiResponse<City>>(
				`${this.apiBaseUrl}/admin/cities/${id}`,
				input,
			)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const updated = response.data;
						this.cities.update((cities) =>
							cities.map((c) => (c.id === id ? updated : c)),
						);
						if (this.currentCity()?.id === id) {
							this.currentCity.set(updated);
						}
					}
				}),
				catchError((error) => {
					console.error(`Error updating city ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la mise à jour de la ville",
					});
				}),
			);
	}

	/**
	 * Toggle a city's active status.
	 */
	toggleCityStatus(id: number) {
		return this.http
			.put<
				ApiResponse<{ id: number; isActive: boolean }>
			>(`${this.apiBaseUrl}/admin/cities/${id}/toggle-status`, {})
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						const isActive = response.data.isActive;
						this.cities.update((cities) =>
							cities.map((c) =>
								c.id === id ? { ...c, isActive } : c,
							),
						);
						if (this.currentCity()?.id === id) {
							this.currentCity.update((c) =>
								c ? { ...c, isActive } : c,
							);
						}
					}
				}),
				catchError((error) => {
					console.error(`Error toggling city status ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors du changement de statut",
					});
				}),
			);
	}

	/**
	 * Delete a city.
	 */
	deleteCity(id: number) {
		return this.http
			.delete<ApiResponse<void>>(`${this.apiBaseUrl}/admin/cities/${id}`)
			.pipe(
				tap((response) => {
					if (response.success) {
						this.cities.update((cities) =>
							cities.filter((c) => c.id !== id),
						);
						if (this.currentCity()?.id === id) {
							this.currentCity.set(null);
						}
					}
				}),
				catchError((error) => {
					console.error(`Error deleting city ${id}:`, error);
					return of({
						success: false,
						message:
							error.error?.message ||
							"Erreur lors de la suppression de la ville",
					});
				}),
			);
	}

	/**
	 * Set search query.
	 */
	setSearchQuery(query: string) {
		this.searchQuery.set(query);
	}

	/**
	 * Set status filter.
	 */
	setStatusFilter(status: "active" | "inactive" | null) {
		this.statusFilter.set(status);
	}

	/**
	 * Refresh the cities list using current filters.
	 */
	refreshCities() {
		this.getCities(
			this.searchQuery() || undefined,
			this.statusFilter(),
		).subscribe();
	}

	/**
	 * Format date.
	 */
	formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString("fr-FR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}
}