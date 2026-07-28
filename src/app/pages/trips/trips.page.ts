import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, TripStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';

@Component({
  selector: 'app-trips',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, DataTableComponent],
  templateUrl: 'trips.page.html',
})
export class TripsPage {
  readonly data = inject(MockDataService);
  readonly status = signal<'ALL' | TripStatus>('ALL');

  readonly columns: DataTableColumn[] = [
    { key: 'ref', label: 'Référence' },
    { key: 'route', label: 'Trajet' },
    { key: 'agency', label: 'Agence' },
    { key: 'date', label: 'Départ' },
    { key: 'busPlate', label: 'Bus' },
    { key: 'driver', label: 'Chauffeur' },
    { key: 'fillRate', label: 'Remplissage' },
    { key: 'revenue', label: 'Revenu' },
    { key: 'status', label: 'Statut' },
    { key: 'actions', label: 'Action', align: 'right' },
  ];

  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }

  get kpis() {
    const t = this.data.trips();
    const total = t.length;
    const scheduled = t.filter(x => x.status === 'SCHEDULED').length;
    const inProgress = t.filter(x => x.status === 'IN_PROGRESS').length;
    const totalRevenue = t.reduce((s, x) => s + x.revenue, 0);
    const totalPassengers = t.reduce((s, x) => s + x.bookedSeats, 0);
    return { total, scheduled, inProgress, totalRevenue, totalPassengers };
  }

  filtered() {
    const st = this.status();
    if (st === 'ALL') return this.data.trips();
    return this.data.trips().filter(t => t.status === st);
  }

  onStatusChange(value: string) { this.status.set(value as 'ALL' | TripStatus); }
}
