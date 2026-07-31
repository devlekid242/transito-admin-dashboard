import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationService, Application, ApplicationStatus } from '../../services/application.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';

@Component({
  selector: 'app-applications',
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    StatusBadgeComponent,
    DataTableComponent
  ],
  templateUrl: 'applications.page.html',
})
export class ApplicationsPage implements OnInit {
  readonly applicationService = inject(ApplicationService);

  // Get data from service
  readonly applications = this.applicationService.applications;
  readonly loading = this.applicationService.loadingApplications;
  readonly applicationKpis = this.applicationService.applicationKpis;
  readonly loadingKpis = this.applicationService.loadingKpis;

  // Datatable configuration
  readonly columns: DataTableColumn[] = [
    { key: 'ref', label: 'Référence', align: 'left' },
    { key: 'agencyName', label: 'Agence', align: 'left' },
    { key: 'city', label: 'Ville', align: 'left' },
    { key: 'fleetSize', label: 'Flotte', align: 'left' },
    { key: 'submittedAt', label: 'Soumise le', align: 'left' },
    { key: 'status', label: 'Statut', align: 'left' },
    { key: 'documentsCount', label: 'Documents', align: 'left' },
    { key: 'actions', label: 'Action', align: 'right' },
  ];

  readonly searchPlaceholder = 'Rechercher par réf, agence, ville, représentant...';
  readonly emptyMessage = 'Aucune candidature trouvée.';

  constructor() {}

  ngOnInit(): void {
    // Load initial data
    this.loadInitialData();
    this.loadKpis();
  }

  private loadInitialData(): void {
    // Load all applications
    this.applicationService.getApplications(1, 20).subscribe();
  }

  private loadKpis(): void {
    // Load KPIs
    this.applicationService.getApplicationKpis().subscribe();
  }

  // Helper methods for display
  str(n: number): string {
    return String(n);
  }

  // Get count by status
  pendingCount(): number {
    return this.applicationService.getApplicationsByStatus('PENDING');
  }

  reviewCount(): number {
    return this.applicationService.getApplicationsByStatus('UNDER_REVIEW');
  }

  approvedCount(): number {
    return this.applicationService.getApplicationsByStatus('APPROVED');
  }

  rejectedCount(): number {
    return this.applicationService.getApplicationsByStatus('REJECTED');
  }

  // Filter handlers
  onSearch(value: string): void {
    this.applicationService.setSearchQuery(value);
  }

  onStatusChange(value: string): void {
    this.applicationService.setStatusFilter(value as ApplicationStatus | 'ALL');
  }

  // Get status badge variant
  getStatusBadgeVariant(status: ApplicationStatus): 'pending' | 'info' | 'approved' | 'rejected' {
    return this.applicationService.getStatusBadgeVariant(status);
  }

  // Get status label
  getStatusLabel(status: ApplicationStatus): string {
    return this.applicationService.getStatusLabel(status);
  }

  // Refresh data
  refreshData(): void {
    this.applicationService.refreshApplications();
    this.applicationService.getApplicationKpis().subscribe();
  }
}
