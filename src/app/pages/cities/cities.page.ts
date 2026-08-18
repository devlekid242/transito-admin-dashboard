import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CityService,
  City,
  CityCreateInput,
  CityUpdateInput,
} from '../../services/city.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';

interface CityFormModel {
  name: string;
  code: string;
  country: string;
  isActive: boolean;
}

const EMPTY_FORM: CityFormModel = {
  name: '',
  code: '',
  country: 'Congo',
  isActive: true,
};

@Component({
  selector: 'app-cities',
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DataTableComponent,
    ModalComponent,
  ],
  templateUrl: 'cities.page.html',
})
export class CitiesPage {
  readonly cityService = inject(CityService);

  // DataTable configuration
  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Ville', align: 'left', isImage: false },
    { key: 'code', label: 'Code', align: 'center', isImage: false },
    { key: 'country', label: 'Pays', align: 'left', isImage: false },
    { key: 'status', label: 'Statut', align: 'center', isImage: false },
    { key: 'tripsCount', label: 'Trajets', align: 'center', isImage: false },
    { key: 'boardingPointsCount', label: 'Points d\'embarquement', align: 'center', isImage: false },
    { key: 'actions', label: 'Actions', align: 'right', isImage: false },
  ];

  // Data from service
  readonly cities = this.cityService.cities;
  readonly loading = this.cityService.loadingCities;

  // Computed properties
  readonly totalCities = computed(() => this.cityService.totalCities());
  readonly activeCitiesCount = computed(() => this.cityService.activeCitiesCount());
  readonly inactiveCitiesCount = computed(() => this.cityService.inactiveCitiesCount());

  // Create/Edit form modal state
  readonly showFormModal = signal(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly editingCity = signal<City | null>(null);
  readonly formSaving = signal(false);
  readonly formError = signal<string | null>(null);
  form: CityFormModel = { ...EMPTY_FORM };

  // Delete confirmation modal state
  readonly showDeleteModal = signal(false);
  readonly cityToDelete = signal<City | null>(null);
  readonly deleteError = signal<string | null>(null);
  readonly deleting = signal(false);

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.cityService
      .getCities(
        this.cityService.searchQuery() || undefined,
        this.cityService.statusFilter(),
      )
      .subscribe();
  }

  // Handle search
  onSearch(value: string) {
    this.cityService.setSearchQuery(value);
    this.loadData();
  }

  // Handle status filter
  onStatusFilter(status: string | null) {
    this.cityService.setStatusFilter(
      status === 'active' || status === 'inactive' ? status : null,
    );
    this.loadData();
  }

  // Refresh data
  refresh() {
    this.loadData();
  }

  // --- Create ---
  openCreateModal() {
    this.formMode.set('create');
    this.editingCity.set(null);
    this.form = { ...EMPTY_FORM };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  // --- Edit ---
  openEditModal(city: City) {
    this.formMode.set('edit');
    this.editingCity.set(city);
    this.form = {
      name: city.name,
      code: city.code || '',
      country: city.country || '',
      isActive: city.isActive,
    };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  closeFormModal() {
    this.showFormModal.set(false);
    this.editingCity.set(null);
    this.formError.set(null);
  }

  saveCity() {
    const name = this.form.name.trim();
    if (!name) {
      this.formError.set('Le nom de la ville est obligatoire.');
      return;
    }

    this.formSaving.set(true);
    this.formError.set(null);

    const payload: CityCreateInput | CityUpdateInput = {
      name,
      code: this.form.code.trim() || null,
      country: this.form.country.trim() || null,
      isActive: this.form.isActive,
    };

    const editing = this.editingCity();
    const request =
      this.formMode() === 'edit' && editing
        ? this.cityService.updateCity(editing.id, payload)
        : this.cityService.createCity(payload as CityCreateInput);

    request.subscribe({
      next: (response) => {
        this.formSaving.set(false);
        if (response.success) {
          this.closeFormModal();
        } else {
          this.formError.set(response.message || 'Une erreur est survenue.');
        }
      },
      error: (err) => {
        this.formSaving.set(false);
        this.formError.set(err?.error?.message || 'Une erreur est survenue.');
      },
    });
  }

  // --- Toggle active/inactive ---
  toggleStatus(city: City) {
    this.cityService.toggleCityStatus(city.id).subscribe();
  }

  // --- Delete ---
  confirmDelete(city: City) {
    this.cityToDelete.set(city);
    this.deleteError.set(null);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.cityToDelete.set(null);
    this.deleteError.set(null);
  }

  deleteCity() {
    const city = this.cityToDelete();
    if (!city) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.cityService.deleteCity(city.id).subscribe({
      next: (response) => {
        this.deleting.set(false);
        if (response.success) {
          this.showDeleteModal.set(false);
          this.cityToDelete.set(null);
        } else {
          this.deleteError.set(
            response.message || 'Impossible de supprimer cette ville.',
          );
        }
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(
          err?.error?.message || 'Impossible de supprimer cette ville.',
        );
      },
    });
  }

  // Get status badge variant
  getStatusBadgeVariant(isActive: boolean): 'active' | 'suspended' {
    return isActive ? 'active' : 'suspended';
  }

  // Get status text
  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  // Format date
  formatDate(dateString: string): string {
    return this.cityService.formatDate(dateString);
  }
}