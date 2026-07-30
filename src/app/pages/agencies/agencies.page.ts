import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService, Agency } from '../../services/agency.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-agencies',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DataTableComponent,
    ModalComponent
  ],
  templateUrl: 'agencies.page.html',
})
export class AgenciesPage {
  readonly agencyService = inject(AgencyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // DataTable configuration
  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Agence', align: 'left' },
    { key: 'email', label: 'Email', align: 'left' },
    { key: 'phone', label: 'Telephone', align: 'left' },
    { key: 'kyc', label: 'Statut KYC', align: 'center' },
    { key: 'status', label: 'Statut compte', align: 'center' },
    { key: 'tripsCount', label: 'Voyages', align: 'center' },
    { key: 'reservationsCount', label: 'Reservations', align: 'center' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  // Get agencies from service
  readonly agencies = this.agencyService.agencies;
  readonly loading = this.agencyService.loadingAgencies;
  readonly kycDistribution = this.agencyService.kycDistribution;

  // Computed properties
  readonly totalAgencies = computed(() => this.agencyService.totalAgencies());
  readonly suspendedCount = computed(() => this.agencyService.getAgenciesByStatus('suspended'));

  // Modal state
  readonly showDeleteModal = signal(false);
  readonly agencyToDelete = signal<Agency | null>(null);

  constructor() {
    // Load initial data
    this.loadData();
    this.loadKycDistribution();
  }

  private loadData() {
    const page = this.agencyService.currentPage();
    const limit = 10;
    const status = this.agencyService.statusFilter();
    const search = this.agencyService.searchQuery();
    
    this.agencyService.getAgencies(page, limit, status || undefined, search || undefined).subscribe();
  }

  private loadKycDistribution() {
    this.agencyService.getKycDistribution().subscribe();
  }

  initials(name: string) {
    return this.agencyService.getInitials(name);
  }

  getKycCount(status: string) {
    return this.kycDistribution()[status] || 0;
  }

  suspendedCountValue() {
    return this.agencyService.getAgenciesByStatus('suspended');
  }

  toggleAccount(agency: Agency) {
    this.agencyService.toggleAgencyStatus(agency.id).subscribe();
  }

  // Delete agency
  confirmDelete(agency: Agency) {
    this.agencyToDelete.set(agency);
    this.showDeleteModal.set(true);
  }

  deleteAgency() {
    const agency = this.agencyToDelete();
    if (agency) {
      this.agencyService.deleteAgency(agency.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showDeleteModal.set(false);
            this.agencyToDelete.set(null);
          }
        },
        error: (err) => {
          console.error('Error deleting agency:', err);
          this.showDeleteModal.set(false);
          this.agencyToDelete.set(null);
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.agencyToDelete.set(null);
  }

  // Handle search
  onSearch(value: string) {
    this.agencyService.setSearchQuery(value);
    this.loadData();
  }

  // Handle status filter
  onStatusFilter(status: string | null) {
    this.agencyService.setStatusFilter(status);
    this.loadData();
  }

  // Handle page change
  onPageChange(page: number) {
    this.agencyService.currentPage.set(page);
    this.loadData();
  }

  // Refresh data
  refresh() {
    this.loadData();
    this.loadKycDistribution();
  }

  // Format currency
  formatCurrency(amount: number) {
    return this.agencyService.formatCurrency(amount);
  }

  // Get KYC badge variant
  getKycBadgeVariant(kyc: string) {
    return this.agencyService.getKycBadgeVariant(kyc);
  }

  // Get status badge variant
  getStatusBadgeVariant(status: string) {
    return this.agencyService.getStatusBadgeVariant(status);
  }

  // Get KYC label
  getKycLabel(kyc: string): string {
    switch (kyc) {
      case 'verified': return 'Verifie';
      case 'pending': return 'A valider';
      case 'missing': return 'Manquant';
      case 'rejected': return 'Rejete';
      default: return 'Manquant';
    }
  }

  // Get KYC icon
  getKycIcon(kyc: string): string {
    switch (kyc) {
      case 'verified': return 'fa-circle-check';
      case 'pending': return 'fa-clock';
      case 'missing': return 'fa-file-circle-xmark';
      case 'rejected': return 'fa-circle-xmark';
      default: return 'fa-file-circle-xmark';
    }
  }

  // Get status text
  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'suspended': return 'Suspendu';
      case 'pending': return 'En attente';
      default: return status;
    }
  }

  // Format date
  formatDate(dateString: string): string {
    return this.agencyService.formatDate(dateString);
  }
}
