import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TripService, TripStatus, Trip, TripKpis } from '../../services/trip.service';
import { AgencyService } from '../../services/agency.service';
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
  readonly tripService = inject(TripService);
  readonly agencyService = inject(AgencyService);
  
  readonly trips = this.tripService.trips;
  readonly filteredTrips = this.tripService.filteredTrips;
  readonly loading = this.tripService.loadingTrips;
  readonly tripKpis = this.tripService.tripKpis;
  readonly loadingKpis = this.tripService.loadingKpis;
  
  readonly status = this.tripService.statusFilter;

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

  fcfa(n: number) { return this.tripService.formatCurrency(n); }
  str(n: number) { return String(n); }

  get kpis(): TripKpis | null {
    return this.tripKpis();
  }

  filtered() {
    return this.filteredTrips();
  }

  onStatusChange(value: string) { 
    this.tripService.setStatusFilter(value as TripStatus | 'ALL'); 
    this.tripService.refreshTrips();
  }

  constructor() {
    // Load initial data
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Load trips with default filters
    this.tripService.getTrips(1, 10).subscribe();
    this.tripService.getTripKpis().subscribe();
  }
}
