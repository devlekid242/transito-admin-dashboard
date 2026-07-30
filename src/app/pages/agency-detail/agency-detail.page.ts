import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService, Agency, Trip, Reservation } from '../../services/agency.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';

type Tab = 'info' | 'trips' | 'bookings';

@Component({
  selector: 'app-agency-detail',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    StatusBadgeComponent,
    DataTableComponent
  ],
  templateUrl: 'agency-detail.page.html',
})
export class AgencyDetailPage implements OnInit {
  private readonly agencyService = inject(AgencyService);
  private readonly route = inject(ActivatedRoute);

  readonly agencyId = signal<number | null>(null);
  readonly agency = this.agencyService.currentAgency;
  readonly trips = this.agencyService.agencyTrips;
  readonly reservations = this.agencyService.agencyReservations;
  readonly loading = this.agencyService.loadingAgency;
  readonly loadingTrips = this.agencyService.loadingTrips;
  readonly loadingReservations = this.agencyService.loadingReservations;

  // Tabs
  readonly activeTab = signal<Tab>('info');
  readonly tabs: Tab[] = ['info', 'trips', 'bookings'];

  // DataTable columns for trips
  readonly tripColumns: DataTableColumn[] = [
    { key: 'route', label: 'Trajet', align: 'left' },
    { key: 'tripDate', label: 'Date', align: 'left' },
    { key: 'departureTime', label: 'Heure', align: 'left' },
    { key: 'price', label: 'Prix', align: 'right' },
    { key: 'status', label: 'Statut', align: 'center' },
    { key: 'seats', label: 'Places', align: 'center' },
  ];

  // DataTable columns for reservations
  readonly reservationColumns: DataTableColumn[] = [
    { key: 'reference', label: 'Reference', align: 'left' },
    { key: 'tripRoute', label: 'Trajet', align: 'left' },
    { key: 'userName', label: 'Passager', align: 'left' },
    { key: 'createdAt', label: 'Date', align: 'left' },
    { key: 'totalAmount', label: 'Montant', align: 'right' },
    { key: 'paymentStatus', label: 'Statut', align: 'center' },
  ];

  // Computed data for trips with formatted values
  readonly formattedTrips = computed(() => {
    return this.trips().map(trip => ({
      ...trip,
      route: `${trip.departureCity} -> ${trip.arrivalCity}`,
      tripDate: this.formatDate(trip.departureTime),
      departureTime: this.formatDateTime(trip.departureTime).split(', ')[1],
      price: this.fcfa(trip.price),
      status: this.getTripStatusText(trip.status),
      statusRaw: trip.status,
      seats: `${trip.seatsReserved}/${trip.maxSeats}`,
    }));
  });

  // Computed data for reservations with formatted values
  readonly formattedReservations = computed(() => {
    return this.reservations().map(reservation => ({
      ...reservation,
      reference: reservation.reference || '#' + reservation.id,
      userName: reservation.userName || 'Anonyme',
      createdAt: this.formatDateTime(reservation.createdAt).split(', ')[0],
      totalAmount: this.fcfa(reservation.totalAmount),
      paymentStatus: this.getPaymentStatusText(reservation.paymentStatus),
    }));
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.agencyId.set(Number(id));
    }
  }

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    const id = this.agencyId();
    if (id) {
      // Load agency details
      this.agencyService.getAgency(id).subscribe();
    }
  }

  // Tab switching
  setTab(tab: Tab) {
    this.activeTab.set(tab);
    const id = this.agencyId();
    if (id) {
      if (tab === 'trips') {
        this.agencyService.getAgencyTrips(id).subscribe();
      } else if (tab === 'bookings') {
        this.agencyService.getAgencyReservations(id).subscribe();
      }
    }
  }

  // Get tab label
  getTabLabel(tab: Tab): string {
    switch (tab) {
      case 'info': return 'Informations';
      case 'trips': return `Voyages (${this.trips().length})`;
      case 'bookings': return `Reservations (${this.reservations().length})`;
      default: return '';
    }
  }

  // Get tab icon
  getTabIcon(tab: Tab): string {
    switch (tab) {
      case 'info': return 'fa-circle-info';
      case 'trips': return 'fa-road';
      case 'bookings': return 'fa-ticket';
      default: return '';
    }
  }

  // Formatters
  fcfa(n: number) {
    return this.agencyService.formatCurrency(n);
  }

  initials(name: string) {
    return this.agencyService.getInitials(name);
  }

  formatDate(dateString: string) {
    return this.agencyService.formatDate(dateString);
  }

  formatDateTime(dateString: string) {
    return this.agencyService.formatDateTime(dateString);
  }

  getKycBadgeVariant(kyc: string | undefined) {
    return this.agencyService.getKycBadgeVariant(kyc || 'missing');
  }

  getStatusBadgeVariant(status: string) {
    return this.agencyService.getStatusBadgeVariant(status);
  }

  // Get status text for trips
  getTripStatusText(status: string): string {
    switch (status) {
      case 'planifie': return 'Planifie';
      case 'embarquement': return 'Embarquement';
      case 'en_route': return 'En route';
      case 'termine': return 'Termine';
      case 'annule': return 'Annule';
      default: return status;
    }
  }

  // Get payment status text
  getPaymentStatusText(status: string): string {
    switch (status) {
      case 'en_attente': return 'En attente';
      case 'paye': return 'Paye';
      case 'echoue': return 'Echoue';
      case 'rembourse': return 'Rembourse';
      default: return status;
    }
  }

  // Get KYC label
  getKycLabel(kyc: string | undefined): string {
    if (!kyc) return 'Manquant';
    switch (kyc) {
      case 'verified': return 'Verifie';
      case 'pending': return 'A valider';
      case 'missing': return 'Manquant';
      case 'rejected': return 'Rejete';
      default: return 'Manquant';
    }
  }

  // Get KYC icon
  getKycIcon(kyc: string | undefined): string {
    if (!kyc) return 'fa-file-circle-xmark';
    switch (kyc) {
      case 'verified': return 'fa-circle-check';
      case 'pending': return 'fa-clock';
      case 'missing': return 'fa-file-circle-xmark';
      case 'rejected': return 'fa-circle-xmark';
      default: return 'fa-file-circle-xmark';
    }
  }

  // Refresh data
  refresh() {
    const id = this.agencyId();
    if (id) {
      this.agencyService.getAgency(id).subscribe();
      if (this.activeTab() === 'trips') {
        this.agencyService.getAgencyTrips(id).subscribe();
      } else if (this.activeTab() === 'bookings') {
        this.agencyService.getAgencyReservations(id).subscribe();
      }
    }
  }

  // Toggle agency status
  toggleStatus() {
    const id = this.agencyId();
    if (id) {
      this.agencyService.toggleAgencyStatus(id).subscribe();
    }
  }

  // Check if trip is active
  isTripActive(trip: Trip): boolean {
    return trip.status === 'planifie' || trip.status === 'embarquement' || trip.status === 'en_route';
  }

  // Check if trip is active by status string
  isTripActiveByStatus(status: string): boolean {
    return status === 'planifie' || status === 'embarquement' || status === 'en_route';
  }

  // Get fill rate percentage
  getFillRate(trip: Trip): number {
    if (trip.maxSeats === 0) return 0;
    return Math.round((trip.seatsReserved / trip.maxSeats) * 100);
  }
}
