import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AgencyService,
  Agency,
  AgencyAgent,
  AgencyBus,
  AgencyBoardingPoint,
  AgencyDocumentAdmin,
  AgencyStats,
  Trip,
  Reservation,
} from '../../services/agency.service';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { environment } from '../../../environments/environment';

type Tab = 'info' | 'admin' | 'agents' | 'trips' | 'bookings' | 'buses' | 'points' | 'finance';

@Component({
  selector: 'app-agency-detail',
  imports: [CommonModule, RouterLink, StatusBadgeComponent, DataTableComponent],
  templateUrl: 'agency-detail.page.html',
})
export class AgencyDetailPage implements OnInit {
  private readonly agencyService = inject(AgencyService);
  private readonly route = inject(ActivatedRoute);

  readonly baseApiUrl = environment.baseApiUrl;

  readonly agencyId = signal<number | null>(null);
  readonly agency = this.agencyService.currentAgency;
  readonly stats = this.agencyService.agencyStats;
  readonly trips = this.agencyService.agencyTrips;
  readonly reservations = this.agencyService.agencyReservations;
  readonly agents = this.agencyService.currentAgencyAgents;
  readonly buses = this.agencyService.currentAgencyBuses;
  readonly points = this.agencyService.currentAgencyBordingPoind;

  readonly loading = this.agencyService.loadingAgency;
  readonly loadingStats = this.agencyService.loadingStats;
  readonly loadingTrips = this.agencyService.loadingTrips;
  readonly loadingReservations = this.agencyService.loadingReservations;
  readonly loadingAgents = this.agencyService.loadingAgencyAgents;
  readonly loadingBuses = this.agencyService.loadingAgencyBuses;
  readonly loadingPoints = this.agencyService.loadingAgencyBordingPoind;

  readonly activeTab = signal<Tab>('info');
  readonly loadedTabs = new Set<Tab>();
  readonly tabs: Tab[] = ['info', 'admin', 'agents', 'trips', 'bookings', 'buses', 'points', 'finance'];

  readonly tripColumns: DataTableColumn[] = [
    { key: 'route', label: 'Trajet', align: 'left' },
    { key: 'tripDate', label: 'Date', align: 'left' },
    { key: 'departureTime', label: 'Heure', align: 'left' },
    { key: 'bus', label: 'Bus', align: 'left' },
    { key: 'price', label: 'Prix', align: 'right' },
    { key: 'status', label: 'Statut', align: 'center' },
    { key: 'seats', label: 'Places', align: 'center' },
  ];

  readonly reservationColumns: DataTableColumn[] = [
    { key: 'reference', label: 'Référence', align: 'left' },
    { key: 'tripRoute', label: 'Trajet', align: 'left' },
    { key: 'userName', label: 'Passager', align: 'left' },
    { key: 'userPhone', label: 'Téléphone', align: 'left' },
    { key: 'createdAt', label: 'Date', align: 'left' },
    { key: 'totalAmount', label: 'Montant', align: 'right' },
    { key: 'paymentStatus', label: 'Paiement', align: 'center' },
  ];

  readonly formattedTrips = computed(() => this.trips().map(trip => ({
    ...trip,
    route: `${trip.departureCity} → ${trip.arrivalCity}`,
    tripDate: trip.tripDate ? this.formatDate(trip.tripDate) : this.formatDate(trip.departureTime),
    departureTime: trip.departureTimeOfDay || this.formatTime(trip.departureTime),
    bus: trip.busPlate ? `${trip.busPlate}${trip.busType ? ` · ${trip.busType}` : ''}` : 'Non affecté',
    price: this.fcfa(trip.price),
    status: this.getTripStatusText(trip.status),
    statusRaw: trip.status,
    seats: `${trip.seatsReserved}/${trip.maxSeats}`,
  })));

  readonly formattedReservations = computed(() => this.reservations().map(reservation => ({
    ...reservation,
    reference: reservation.reference || `#${reservation.id}`,
    userName: reservation.userName || 'Anonyme',
    userPhone: reservation.userPhone || '—',
    createdAt: this.formatDateTime(reservation.createdAt),
    totalAmount: this.fcfa(reservation.totalAmount),
    paymentStatus: this.getPaymentStatusText(reservation.paymentStatus),
  })));

  readonly admin = computed(() => this.agency()?.admin || null);
  readonly activeTripsCount = computed(() => this.stats()?.general.activeTripsCount ?? 0);
  readonly totalRevenue = computed(() => this.stats()?.general.totalRevenue ?? 0);
  readonly fillRate = computed(() => this.stats()?.general.fillRate ?? 0);

  // ---- Retrait mobile money ----
  readonly payoutRequest = this.agencyService.currentAgencyPayoutRequest;
  readonly loadingPayoutRequest = this.agencyService.loadingPayoutRequests;
  readonly submittingPayoutDecision = this.agencyService.submittingPayoutDecision;
  readonly payoutActionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly showRejectPayoutModal = signal(false);
  readonly rejectPayoutReason = signal('');

  // ---- Documents / validation KYC ----
  readonly documents = computed<AgencyDocumentAdmin[]>(() => this.agency()?.documents ?? []);
  readonly submittingDocumentDecision = this.agencyService.submittingDocumentDecision;
  readonly documentActionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly showRejectDocumentModal = signal(false);
  readonly rejectDocumentReason = signal('');
  readonly documentPendingRejection = signal<AgencyDocumentAdmin | null>(null);

  /** Numéro actif : d'abord celui de l'agence (si le back l'expose), sinon celui rapporté par la demande en attente. */
  readonly activePayoutMsisdn = computed(
    () => this.agency()?.payoutMsisdn || this.payoutRequest()?.currentPayoutMsisdn || null,
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && Number.isFinite(Number(id))) this.agencyId.set(Number(id));
  }

  ngOnInit(): void {
    this.loadBaseData();
  }

  private loadBaseData(): void {
    const id = this.agencyId();
    if (!id) return;
    this.agencyService.getAgency(id).subscribe();
    this.agencyService.getAgencyStats(id).subscribe();
    // Chargé tôt (liste légère) pour pouvoir afficher un indicateur sur l'onglet Finances
    // sans attendre que l'admin clique dessus.
    this.agencyService.getPendingPayoutMsisdnRequests().subscribe();
    this.loadedTabs.add('info');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTab(tab);
  }

  private loadTab(tab: Tab, force = false): void {
    const id = this.agencyId();
    if (!id || (!force && this.loadedTabs.has(tab))) return;

    switch (tab) {
      case 'admin':
      case 'agents':
        this.agencyService.getAgencyAgents(id).subscribe(() => this.loadedTabs.add(tab));
        break;
      case 'trips':
        this.agencyService.getAgencyTrips(id).subscribe(() => this.loadedTabs.add(tab));
        break;
      case 'bookings':
        this.agencyService.getAgencyReservations(id).subscribe(() => this.loadedTabs.add(tab));
        break;
      case 'buses':
        this.agencyService.getAgencyBuses(id).subscribe(() => this.loadedTabs.add(tab));
        break;
      case 'points':
        this.agencyService.getAgencyBordingPoind(id).subscribe(() => this.loadedTabs.add(tab));
        break;
      case 'finance':
        this.agencyService.getAgencyStats(id).subscribe(() => this.loadedTabs.add(tab));
        this.agencyService.getPendingPayoutMsisdnRequests().subscribe();
        break;
      case 'info':
        this.agencyService.getAgency(id).subscribe(() => this.loadedTabs.add(tab));
        break;
    }
  }

  getTabLabel(tab: Tab): string {
    const counts: Partial<Record<Tab, number>> = {
      agents: this.agency()?.agentsCount ?? this.agents().length,
      trips: this.agency()?.tripsCount ?? this.trips().length,
      bookings: this.agency()?.reservationsCount ?? this.reservations().length,
      buses: this.agency()?.busesCount ?? this.buses().length,
      points: this.agency()?.boardingPointsCount ?? this.points().length,
    };
    const labels: Record<Tab, string> = {
      info: 'Vue générale', admin: 'Administrateur', agents: 'Agents', trips: 'Voyages',
      bookings: 'Réservations', buses: 'Bus', points: 'Embarquement', finance: 'Finances',
    };
    return counts[tab] !== undefined ? `${labels[tab]} (${counts[tab]})` : labels[tab];
  }

  getTabIcon(tab: Tab): string {
    return ({
      info: 'fa-circle-info', admin: 'fa-user-shield', agents: 'fa-users', trips: 'fa-road',
      bookings: 'fa-ticket', buses: 'fa-bus', points: 'fa-location-dot', finance: 'fa-wallet',
    } as Record<Tab, string>)[tab];
  }

  fcfa(n: number): string { return this.agencyService.formatCurrency(n); }
  initials(name: string): string { return this.agencyService.getInitials(name); }
  formatDate(value: string | null | undefined): string { return value ? this.agencyService.formatDate(value) : '—'; }
  formatDateTime(value: string | null | undefined): string { return value ? this.agencyService.formatDateTime(value) : '—'; }
  formatTime(value: string | null | undefined): string { return value ? this.agencyService.formatTime(value) : '—'; }

  getKycBadgeVariant(kyc: string | undefined) { return this.agencyService.getKycBadgeVariant(kyc || 'missing'); }
  getStatusBadgeVariant(status: string) { return this.agencyService.getStatusBadgeVariant(status); }

  getTripStatusText(status: string): string {
    switch (status) {
      case 'planifie': case 'SCHEDULED': return 'Planifié';
      case 'embarquement': case 'en_route': case 'IN_PROGRESS': return 'En cours';
      case 'termine': case 'COMPLETED': return 'Terminé';
      case 'annule': case 'CANCELLED': return 'Annulé';
      case 'DELAYED': return 'Retardé';
      default: return status;
    }
  }

  getPaymentStatusText(status: string): string {
    switch (status) {
      case 'en_attente': return 'En attente';
      case 'paye': return 'Payé';
      case 'echoue': return 'Échoué';
      case 'rembourse': return 'Remboursé';
      default: return status;
    }
  }

  getKycLabel(kyc: string | undefined): string {
    switch (kyc) {
      case 'verified': return 'Vérifié';
      case 'pending': return 'À valider';
      case 'rejected': return 'Rejeté';
      default: return 'Manquant';
    }
  }

  getKycIcon(kyc: string | undefined): string {
    switch (kyc) {
      case 'verified': return 'fa-circle-check';
      case 'pending': return 'fa-clock';
      case 'rejected': return 'fa-circle-xmark';
      default: return 'fa-file-circle-xmark';
    }
  }

  getAgentRoleLabel(role: string): string {
    switch (role) {
      case 'admin_agence': return 'Administrateur agence';
      case 'agent': return 'Agent';
      default: return role || 'Agent';
    }
  }

  getAgentStatusVariant(status: string): 'active' | 'suspended' | 'pending' {
    if (status === 'active') return 'active';
    if (status === 'pending') return 'pending';
    return 'suspended';
  }

  getBusStatusLabel(status: string): string {
    switch (status) {
      case 'disponible': return 'Disponible';
      case 'maintenance': return 'Maintenance';
      case 'hors_service': return 'Hors service';
      default: return status;
    }
  }

  getPointTypeLabel(type: string): string {
    switch (type) {
      case 'principal': return 'Principal';
      case 'secondaire': return 'Secondaire';
      case 'relais': return 'Relais';
      default: return type || 'Point';
    }
  }

  isFeatureEnabled(value: boolean | number): boolean { return value === true || value === 1; }
  isTripActiveByStatus(status: string): boolean {
    return ['planifie', 'embarquement', 'en_route', 'SCHEDULED', 'IN_PROGRESS'].includes(status);
  }
  getFillRate(trip: Trip): number { return trip.maxSeats ? Math.round((trip.seatsReserved / trip.maxSeats) * 100) : 0; }

  refresh(): void {
    const id = this.agencyId();
    if (!id) return;
    this.agencyService.getAgency(id).subscribe();
    this.agencyService.getAgencyStats(id).subscribe();
    this.loadedTabs.clear();
    this.loadedTabs.add('info');
    this.loadTab(this.activeTab(), true);
  }

  toggleStatus(): void {
    const id = this.agencyId();
    if (id) this.agencyService.toggleAgencyStatus(id).subscribe();
  }

  // ---- Retrait mobile money ----

  approvePayoutMsisdn(): void {
    const id = this.agencyId();
    if (!id || this.submittingPayoutDecision()) return;

    this.agencyService.approvePayoutMsisdn(id).subscribe({
      next: (response: any) => {
        if (response?.success === false) {
          this.payoutActionMessage.set({ type: 'error', text: response.message });
          return;
        }
        this.payoutActionMessage.set({ type: 'success', text: 'Numéro de retrait validé avec succès.' });
      },
      error: () => {
        this.payoutActionMessage.set({
          type: 'error',
          text: 'Impossible de valider le numéro de retrait.',
        });
      },
    });
  }

  openRejectPayoutModal(): void {
    this.rejectPayoutReason.set('');
    this.showRejectPayoutModal.set(true);
  }

  closeRejectPayoutModal(): void {
    this.showRejectPayoutModal.set(false);
  }

  confirmRejectPayoutMsisdn(): void {
    const id = this.agencyId();
    if (!id || this.submittingPayoutDecision()) return;

    this.agencyService.rejectPayoutMsisdn(id, this.rejectPayoutReason().trim() || undefined).subscribe({
      next: (response: any) => {
        this.showRejectPayoutModal.set(false);
        if (response?.success === false) {
          this.payoutActionMessage.set({ type: 'error', text: response.message });
          return;
        }
        this.payoutActionMessage.set({ type: 'success', text: 'Proposition de numéro rejetée.' });
      },
      error: () => {
        this.showRejectPayoutModal.set(false);
        this.payoutActionMessage.set({
          type: 'error',
          text: 'Impossible de rejeter la proposition.',
        });
      },
    });
  }

  // ---- Documents / validation KYC ----

  documentFileUrl(doc: AgencyDocumentAdmin): string {
    if (!doc.fileUrl) return '';
    return /^https?:\/\//i.test(doc.fileUrl) ? doc.fileUrl : `${this.baseApiUrl}${doc.fileUrl}`;
  }

  getDocumentStatusVariant(status: string) { return this.agencyService.getDocumentStatusVariant(status); }
  getDocumentStatusLabel(status: string): string { return this.agencyService.getDocumentStatusLabel(status); }

  approveDocument(doc: AgencyDocumentAdmin): void {
    const id = this.agencyId();
    if (!id || this.submittingDocumentDecision()) return;

    this.agencyService.approveAgencyDocument(id, doc.id).subscribe({
      next: (response: any) => {
        if (response?.success === false) {
          this.documentActionMessage.set({ type: 'error', text: response.message });
          return;
        }
        this.documentActionMessage.set({ type: 'success', text: `Document « ${doc.name} » validé avec succès.` });
      },
      error: () => {
        this.documentActionMessage.set({
          type: 'error',
          text: `Impossible de valider le document « ${doc.name} ».`,
        });
      },
    });
  }

  openRejectDocumentModal(doc: AgencyDocumentAdmin): void {
    this.documentPendingRejection.set(doc);
    this.rejectDocumentReason.set('');
    this.showRejectDocumentModal.set(true);
  }

  closeRejectDocumentModal(): void {
    this.showRejectDocumentModal.set(false);
    this.documentPendingRejection.set(null);
  }

  confirmRejectDocument(): void {
    const id = this.agencyId();
    const doc = this.documentPendingRejection();
    if (!id || !doc || this.submittingDocumentDecision()) return;

    this.agencyService.rejectAgencyDocument(id, doc.id, this.rejectDocumentReason().trim() || undefined).subscribe({
      next: (response: any) => {
        this.showRejectDocumentModal.set(false);
        this.documentPendingRejection.set(null);
        if (response?.success === false) {
          this.documentActionMessage.set({ type: 'error', text: response.message });
          return;
        }
        this.documentActionMessage.set({ type: 'success', text: `Document « ${doc.name} » rejeté.` });
      },
      error: () => {
        this.showRejectDocumentModal.set(false);
        this.documentPendingRejection.set(null);
        this.documentActionMessage.set({
          type: 'error',
          text: `Impossible de rejeter le document « ${doc.name} ».`,
        });
      },
    });
  }
}