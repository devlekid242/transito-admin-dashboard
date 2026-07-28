import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, ApplicationStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';

@Component({
  selector: 'app-applications',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, DataTableComponent],
  templateUrl: 'applications.page.html',
})
export class ApplicationsPage {
  readonly data = inject(MockDataService);

  readonly columns: DataTableColumn[] = [
    { key: 'ref', label: 'Référence' },
    { key: 'agencyName', label: 'Agence' },
    { key: 'city', label: 'Ville' },
    { key: 'fleetSize', label: 'Flotte' },
    { key: 'submittedAt', label: 'Soumise le' },
    { key: 'status', label: 'Statut' },
    { key: 'actions', label: 'Action', align: 'right' },
  ];

  str(n: number) { return String(n); }
  pendingCount() { return this.data.applications().filter(a => a.status === 'PENDING').length; }
  reviewCount() { return this.data.applications().filter(a => a.status === 'UNDER_REVIEW').length; }
  approvedCount() { return this.data.applications().filter(a => a.status === 'APPROVED').length; }
  rejectedCount() { return this.data.applications().filter(a => a.status === 'REJECTED').length; }
}
