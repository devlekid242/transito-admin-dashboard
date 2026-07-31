import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TripService, TripDetail } from '../../services/trip.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-trip-detail',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'trip-detail.page.html',
})
export class TripDetailPage implements OnInit {
  readonly tripService = inject(TripService);
  private route = inject(ActivatedRoute);

  readonly tripId = signal<string>('');
  readonly trip = this.tripService.currentTrip;
  readonly loading = this.tripService.loadingDetail;

  fcfa(n: number) { return this.tripService.formatCurrency(n); }

  constructor() {
    this.tripId.set(this.route.snapshot.paramMap.get('id') || '');
  }

  ngOnInit(): void {
    const id = this.tripId();
    if (id) {
      this.loadTripDetail(Number(id));
    }
  }

  private loadTripDetail(id: number): void {
    this.tripService.getTripDetail(id).subscribe();
  }

  get boardedCount() {
    return this.trip()?.manifest.filter(p => p.status === 'BOARDED').length || 0;
  }
  get noShowCount() {
    return this.trip()?.manifest.filter(p => p.status === 'NO_SHOW').length || 0;
  }
  get boardingCount() {
    return this.trip()?.manifest.filter(p => p.status === 'BOARDING').length || 0;
  }

  // Status helper methods
  getStatusLabel(status: string): string {
    return this.tripService.getStatusLabel(status as any);
  }

  getStatusBadgeVariant(status: string): any {
    return this.tripService.getStatusBadgeVariant(status as any);
  }

  getPassengerStatusLabel(status: string): string {
    return this.tripService.getPassengerStatusLabel(status as any);
  }

  getPassengerStatusBadgeVariant(status: string): any {
    return this.tripService.getPassengerStatusBadgeVariant(status as any);
  }
}
