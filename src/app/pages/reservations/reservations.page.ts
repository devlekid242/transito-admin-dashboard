import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService, Reservation, ReservationDetail, ReservationStatus, ReservationKpis, CreateReservationDto, UserSearchItem, TripSearchItem, PaymentSearchItem, TripDetail, PaymentOption } from '../../services/reservation.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SearchSelectItem } from '../../shared/search-select.component';
import { AgencyService } from '../../services/agency.service';

@Component({
  selector: 'app-reservations',
  imports: [
    CommonModule,
    PageHeaderComponent,
    StatCardComponent,
    StatusBadgeComponent,
    DataTableComponent,
    ModalComponent,
    SearchSelectComponent
  ],
  templateUrl: 'reservations.page.html',
})
export class ReservationsPage implements OnInit {
  readonly reservationService = inject(ReservationService);
  readonly agencyService = inject(AgencyService);

  // Reservations data
  readonly reservations = this.reservationService.reservations;
  readonly filteredReservations = this.reservationService.filteredReservations;
  readonly loading = this.reservationService.loadingReservations;
  readonly reservationKpis = this.reservationService.reservationKpis;
  readonly loadingKpis = this.reservationService.loadingKpis;

  // Modal states
  readonly showForm = signal(false);
  readonly showDetailModal = signal(false);
  readonly showCancelModal = signal(false);
  readonly formError = signal('');
  readonly formSuccess = signal('');
  readonly isLoadingForm = signal(false);

  // SearchSelect items
  readonly userItems = this.reservationService.userItems;
  readonly tripItems = this.reservationService.tripItems;
  readonly agencyItems = signal<SearchSelectItem[]>([]);
  readonly paymentItems = this.reservationService.paymentItems;

  // SearchSelectItem requires a string id, but our domain items use numeric ids.
  // These computed signals bridge that gap for use in the template.
  readonly userSearchItems = computed<SearchSelectItem[]>(() =>
    this.userItems().map(u => ({ ...u, id: String(u.id) }))
  );
  readonly tripSearchItems = computed<SearchSelectItem[]>(() =>
    this.tripItems().map(t => ({ ...t, id: String(t.id) }))
  );
  readonly paymentSearchItems = computed<SearchSelectItem[]>(() =>
    this.paymentItems().map(p => ({ ...p, id: String(p.id) }))
  );

  // Exposed so the template can call Number($any($event.target).value)
  readonly Number = Number;

  // Detail modal data
  readonly currentReservation = this.reservationService.currentReservation;

  // Form fields
  readonly selectedUser = signal<SearchSelectItem | null>(null);
  readonly selectedAgency = signal<SearchSelectItem | null>(null);
  readonly selectedTrip = signal<SearchSelectItem | null>(null);
  readonly passengerName = signal('');
  readonly passengerPhone = signal('');
  readonly passengerCni = signal('');
  readonly seatCount = signal(1);
  readonly seatNumbers = signal<(number | null)[]>([null]);
  readonly seatIndexes = computed(() => Array.from({ length: this.seatCount() }, (_, i) => i));
  readonly amount = signal(0);
  readonly paymentMethod = signal('Wave');
  readonly paymentOption = signal<PaymentOption>('new_payment');
  readonly selectedPayment = signal<SearchSelectItem | null>(null);
  readonly notes = signal('');
  
  // Form mode: create or edit
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly editingReservationId = signal<number | null>(null);

  // Date range filter
  readonly dateRange = this.reservationService.dateRange;
  readonly statusFilter = this.reservationService.statusFilter;
  readonly agencyFilter = this.reservationService.agencyFilter;
  readonly searchQuery = this.reservationService.searchQuery;

  // KPIs from service
  get rs(): ReservationKpis | null {
    return this.reservationService.reservationKpis();
  }

  // Datatable configuration
  readonly columns: DataTableColumn[] = [
    { key: 'reference', label: 'Référence', align: 'left' },
    { key: 'user', label: 'Passager', align: 'left' },
    { key: 'agency', label: 'Agence', align: 'left' },
    { key: 'trip', label: 'Trajet', align: 'left' },
    { key: 'date', label: 'Date', align: 'left' },
    { key: 'seats', label: 'Places', align: 'left' },
    { key: 'amount', label: 'Montant', align: 'right' },
    { key: 'paymentMethod', label: 'Paiement', align: 'left' },
    { key: 'status', label: 'Statut', align: 'left' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  readonly searchPlaceholder = 'Rechercher par réf, passager, agence, trajet...';
  readonly emptyMessage = 'Aucune réservation trouvée.';
  readonly searchKeys = ['reference', 'user.fullName', 'user.phoneNumber', 'trip.route', 'agency.name'];

  // Status options for filter
  readonly statusOptions: { value: ReservationStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'CONFIRMED', label: 'Confirmées' },
    { value: 'COMPLETED', label: 'Terminées' },
    { value: 'CANCELLED', label: 'Annulées' },
    { value: 'NO_SHOW', label: 'No-show' },
    { value: 'FAILED', label: 'Échec' },
  ];

  // Payment method options
  readonly paymentMethodOptions = [
    { value: 'Wave', label: 'Wave' },
    { value: 'Orange Money', label: 'Orange Money' },
    { value: 'MTN Mobile Money', label: 'MTN Mobile Money' },
    { value: 'Airtel Money', label: 'Airtel Money' },
    { value: 'Carte bancaire', label: 'Carte bancaire' },
    { value: 'Espèces', label: 'Espèces' },
  ];

  // Payment option types for radio buttons
  readonly paymentOptions: { value: PaymentOption; label: string; description: string }[] = [
    { value: 'new_payment', label: 'Initier un nouveau paiement', description: 'Envoyer une nouvelle demande de paiement au client' },
    { value: 'link_existing', label: 'Lier à un paiement existant', description: 'Lier à un paiement non lié existant' },
  ];

  // Cancel modal fields
  readonly cancelReason = signal('');
  readonly cancelRefund = signal(true);

  constructor() {}

  ngOnInit(): void {
    // Load initial data
    this.loadInitialData();
    this.loadAgencies();
    this.loadUsers();
  }

  private loadInitialData(): void {
    // Load reservations with default filters
    this.reservationService.getReservations(1, 10).subscribe();
    this.reservationService.getReservationKpis().subscribe();
  }

  private loadAgencies(): void {
    // Load agencies for filter dropdown
    this.agencyService.getAgencies().subscribe(response => {
      if (response.success && 'data' in response && response.data) {
        const agencies: SearchSelectItem[] = response.data.map((a: { id: number; name: string; phone: string; city?: string }) => ({
          id: String(a.id),
          label: a.name,
          sublabel: a.city ? `${a.phone} · ${a.city}` : a.phone,
        }));
        this.agencyItems.set(agencies);
      }
    });
  }

  private loadUsers(): void {
    // Load users for search select
    this.reservationService.getUsersForSearch().subscribe();
  }

  // Filter handlers
  onDateRangeChange(range: { start: string; end: string } | null): void {
    this.reservationService.setDateRange(range);
    this.reservationService.refreshReservations();
  }

  onStatusFilterChange(status: ReservationStatus | 'ALL'): void {
    this.reservationService.setStatusFilter(status);
    this.reservationService.refreshReservations();
  }

  onAgencyFilterChange(agencyId: number | null): void {
    this.reservationService.setAgencyFilter(agencyId);
    this.reservationService.refreshReservations();
  }

  // Label of the currently selected agency filter (Angular templates can't parse arrow functions)
  getAgencyFilterLabel(): string {
    const filterId = this.agencyFilter();
    if (filterId === null) return 'Agence';
    const match = this.agencyItems().find(a => a.id === String(filterId));
    return match?.label ?? 'Agence';
  }

  onSearchChange(query: string): void {
    this.reservationService.setSearchQuery(query);
    this.reservationService.refreshReservations();
  }

  // Helper methods
  fcfa(n: number): string {
    return this.reservationService.formatCurrency(n);
  }

  str(n: number): string {
    return String(n);
  }

  // Status label
  getStatusLabel(status: string): string {
    return this.reservationService.getStatusLabel(status as ReservationStatus);
  }

  // Status badge variant
  getStatusBadgeVariant(status: string): 'approved' | 'pending' | 'rejected' | 'missing' | 'verified' {
    return this.reservationService.getStatusBadgeVariant(status);
  }

  // ========================================================================
  // CREATE RESERVATION FORM METHODS
  // ========================================================================

  openForm(reservationId?: number) {
    this.showForm.set(true);
    this.formError.set('');
    this.formSuccess.set('');
    
    if (reservationId) {
      // Edit mode - load existing reservation
      this.formMode.set('edit');
      this.editingReservationId.set(reservationId);
      this.loadReservationForEdit(reservationId);
    } else {
      // Create mode
      this.resetForm();
    }
  }

  closeForm() {
    this.showForm.set(false);
    this.resetForm();
  }

  /**
   * Load reservation details for editing
   */
  loadReservationForEdit(reservationId: number) {
    this.reservationService.getReservationDetail(reservationId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const reservation = response.data;
          
          // Set user
          const userItem: SearchSelectItem = {
            id: String(reservation.user?.id ?? ''),
            label: reservation.user?.fullName ?? '',
            sublabel: reservation.user?.phoneNumber ?? '',
          };
          this.selectedUser.set(userItem);
          this.passengerName.set(reservation.user?.fullName ?? '');
          this.passengerPhone.set(reservation.user?.phoneNumber ?? '');
          
          // Set agency
          const agencyItem: SearchSelectItem = {
            id: String(reservation.agency?.id ?? ''),
            label: reservation.agency?.name ?? '',
            sublabel: '',
          };
          this.selectedAgency.set(agencyItem);
          
          // Set trip
          const tripItem: SearchSelectItem = {
            id: String(reservation.trip?.id ?? ''),
            label: reservation.trip?.route ?? '',
            sublabel: reservation.trip?.departure ?? '',
          };
          this.selectedTrip.set(tripItem);
          
          // Set form fields
          this.amount.set(reservation.totalAmount);
          this.paymentMethod.set(reservation.paymentMethod);
          this.seatCount.set(reservation.seats);
          this.seatNumbers.set(Array(reservation.seats).fill(null).map((_, i) => i + 1));
          this.notes.set('');
          
          // Set payment option based on payment logs
          if (reservation.paymentLogs && reservation.paymentLogs.length > 0) {
            this.paymentOption.set('link_existing');
            // Find the first linked payment
            const linkedPayment = reservation.paymentLogs[0];
            const paymentItem: SearchSelectItem = {
              id: String(linkedPayment.id),
              label: `${linkedPayment.operator} - ${linkedPayment.reference}`,
              sublabel: `${linkedPayment.amount} FCFA - ${linkedPayment.status}`,
            };
            this.selectedPayment.set(paymentItem);
          } else {
            this.paymentOption.set('new_payment');
          }
        }
      },
      error: (error) => {
        console.error('Error loading reservation for edit:', error);
        this.formError.set('Erreur lors du chargement de la réservation.');
      }
    });
  }

  resetForm() {
    this.selectedUser.set(null);
    this.selectedAgency.set(null);
    this.selectedTrip.set(null);
    this.passengerName.set('');
    this.passengerPhone.set('');
    this.passengerCni.set('');
    this.seatCount.set(1);
    this.seatNumbers.set([null]);
    this.amount.set(0);
    this.paymentMethod.set('Wave');
    this.paymentOption.set('new_payment');
    this.selectedPayment.set(null);
    this.notes.set('');
    this.formError.set('');
    this.formSuccess.set('');
    this.formMode.set('create');
    this.editingReservationId.set(null);
  }

  onUserSelected(item: SearchSelectItem | null) {
    this.selectedUser.set(item);
    this.passengerName.set(item?.label ?? '');
    this.passengerPhone.set(item?.sublabel?.split(' · ')[0] ?? '');
    
    // Clear cascading fields when user changes
    this.selectedTrip.set(null);
    this.amount.set(0);
    
    // Load unlinked payments for this user if link to existing payment is enabled
    if (item && this.paymentOption() === 'link_existing') {
      this.reservationService.getUnlinkedPaymentsForUser(Number(item.id)).subscribe();
    } else {
      this.selectedPayment.set(null);
    }
  }

  onAgencySelected(item: SearchSelectItem | null) {
    this.selectedAgency.set(item);
    
    // Clear cascading fields when agency changes
    this.selectedTrip.set(null);
    this.amount.set(0);
    
    // Load trips for this agency
    if (item) {
      this.reservationService.getTripsByAgency(Number(item.id)).subscribe();
    } else {
      this.reservationService.tripItems.set([]);
    }
  }

  onTripSelected(item: SearchSelectItem | null) {
    this.selectedTrip.set(item);
    
    if (item) {
      // Fetch full trip details for autofill
      this.reservationService.getTripDetails(Number(item.id)).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const trip = response.data as TripDetail;
            // Autofill form fields from trip details
            this.amount.set(trip.price ?? 0);
            // Note: Date and departure time fields are not currently in the form,
            // but if they were added, we could set them here:
            // this.date.set(trip.departureDate ?? '');
            // this.departure.set(trip.departureTime ?? '');
          }
        },
        error: (error) => {
          console.error('Error fetching trip details:', error);
        }
      });
    } else {
      // Clear amount if no trip selected
      this.amount.set(0);
    }
  }

  onPaymentMethodChange(method: string) {
    this.paymentMethod.set(method);
  }

  onSeatCountChange(count: number) {
    this.seatCount.set(Math.max(1, count));
    // Update seat numbers array
    const seats = [];
    for (let i = 0; i < count; i++) {
      seats.push(this.seatNumbers()[i] ?? null);
    }
    this.seatNumbers.set(seats);
  }

  onSeatNumberChange(index: number, value: number | null) {
    const seats = [...this.seatNumbers()];
    seats[index] = value;
    this.seatNumbers.set(seats);
  }

  onPaymentOptionChange(option: PaymentOption) {
    this.paymentOption.set(option);
    
    // If linking to existing payment, load unlinked payments for selected user
    if (option === 'link_existing' && this.selectedUser()) {
      this.reservationService.getUnlinkedPaymentsForUser(Number(this.selectedUser()!.id)).subscribe();
    } else {
      this.selectedPayment.set(null);
    }
  }

  onPaymentSelected(item: SearchSelectItem | null) {
    this.selectedPayment.set(item);
    
    // Auto-fill amount from payment if selected
    if (item && this.paymentOption() === 'link_existing') {
      // Find the payment in paymentItems to get the amount
      const payment = this.paymentItems().find(p => p.id === Number(item.id));
      if (payment) {
        this.amount.set(payment.amount);
      }
    }
  }

  submitReservation() {
    this.formError.set('');
    this.isLoadingForm.set(true);

    // Validate form
    if (!this.selectedUser()) {
      this.formError.set('Veuillez sélectionner un client.');
      this.isLoadingForm.set(false);
      return;
    }

    if (!this.selectedAgency()) {
      this.formError.set('Veuillez sélectionner une agence.');
      this.isLoadingForm.set(false);
      return;
    }

    if (!this.selectedTrip()) {
      this.formError.set('Veuillez sélectionner un trajet.');
      this.isLoadingForm.set(false);
      return;
    }

    if (this.amount() <= 0) {
      this.formError.set('Le montant doit être supérieur à 0.');
      this.isLoadingForm.set(false);
      return;
    }

    if (this.seatCount() < 1) {
      this.formError.set('Le nombre de places doit être au moins 1.');
      this.isLoadingForm.set(false);
      return;
    }

    // Check if any seat number is null when seat count > 0
    if (this.seatCount() > 0) {
      const hasNullSeat = this.seatNumbers().some(s => s === null);
      if (hasNullSeat) {
        this.formError.set('Veuillez indiquer un numéro de siège pour chaque place.');
        this.isLoadingForm.set(false);
        return;
      }
    }

    // Handle link_existing payment option - require payment selection
    if (this.paymentOption() === 'link_existing' && !this.selectedPayment()) {
      this.formError.set('Veuillez sélectionner un paiement existant à lier.');
      this.isLoadingForm.set(false);
      return;
    }

    // Prepare DTO
    const dto: CreateReservationDto = {
      userId: Number(this.selectedUser()!.id),
      tripId: Number(this.selectedTrip()!.id),
      totalAmount: this.amount(),
      paymentMethod: this.paymentMethod(),
      paymentOption: this.paymentOption(),
      passengerName: this.passengerName(),
      passengerPhone: this.passengerPhone(),
      passengerCni: this.passengerCni(),
      seatCount: this.seatCount(),
      seatNumbers: this.seatNumbers().map(s => s),
      existingPaymentLogId: this.paymentOption() === 'link_existing' && this.selectedPayment() 
        ? Number(this.selectedPayment()!.id) 
        : null,
      notes: this.notes(),
    };

    // Call appropriate service method based on mode
    const reservationId = this.editingReservationId();
    if (this.formMode() === 'edit' && reservationId) {
      // Update existing reservation
      this.reservationService.updateReservation(reservationId, {
        tripId: dto.tripId,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: dto.paymentOption === 'link_existing' ? 'PAID' : 'PENDING',
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.formSuccess.set('Réservation modifiée avec succès.');
            setTimeout(() => this.closeForm(), 1500);
          } else {
            this.formError.set(response.message || 'Erreur lors de la modification de la réservation.');
          }
        },
        error: (error) => {
          console.error('Error updating reservation:', error);
          this.formError.set('Erreur lors de la modification de la réservation.');
        },
        complete: () => {
          this.isLoadingForm.set(false);
        }
      });
    } else {
      // Create new reservation
      this.reservationService.createReservation(dto).subscribe({
        next: (response) => {
          if (response.success) {
            this.formSuccess.set('Réservation créée avec succès.');
            this.resetForm();
            setTimeout(() => this.closeForm(), 1500);
          } else {
            this.formError.set(response.message || 'Erreur lors de la création de la réservation.');
          }
        },
        error: (error) => {
          console.error('Error creating reservation:', error);
          this.formError.set('Erreur lors de la création de la réservation.');
        },
        complete: () => {
          this.isLoadingForm.set(false);
        }
      });
    }
  }

  // ========================================================================
  // DETAIL MODAL METHODS
  // ========================================================================

  openDetailModal(reservationId: number) {
    this.reservationService.getReservationDetail(reservationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showDetailModal.set(true);
        } else {
          console.error('Error loading reservation detail:', response.message);
        }
      },
      error: (error) => {
        console.error('Error loading reservation detail:', error);
      }
    });
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    this.reservationService.currentReservation.set(null);
  }

  // ========================================================================
  // CANCEL MODAL METHODS
  // ========================================================================

  openCancelModal(reservationId: number) {
    // Store the reservation ID for cancellation
    this.cancelReason.set('');
    this.cancelRefund.set(true);
    this.reservationService.getReservationDetail(reservationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showCancelModal.set(true);
        }
      }
    });
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
    this.cancelReason.set('');
    this.cancelRefund.set(true);
  }

  confirmCancel() {
    const reservation = this.currentReservation();
    if (!reservation) {
      this.closeCancelModal();
      return;
    }

    this.isLoadingForm.set(true);

    this.reservationService.cancelReservation(reservation.id, {
      reason: this.cancelReason(),
      refund: this.cancelRefund(),
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeCancelModal();
          this.closeDetailModal();
          // Show success message - could use a toast here
        } else {
          this.formError.set(response.message || 'Erreur lors de l\'annulation.');
        }
      },
      error: (error) => {
        console.error('Error cancelling reservation:', error);
        this.formError.set('Erreur lors de l\'annulation de la réservation.');
      },
      complete: () => {
        this.isLoadingForm.set(false);
      }
    });
  }

  // ========================================================================
  // ROW ACTIONS
  // ========================================================================

  viewReservation(reservationId: number) {
    this.openDetailModal(reservationId);
  }

  editReservation(reservationId: number) {
    // Open form in edit mode
    this.openForm(reservationId);
  }

  cancelReservationDirect(reservationId: number) {
    this.openCancelModal(reservationId);
  }

  // ========================================================================
  // SEARCH SELECT HANDLERS
  // ========================================================================

  onUserSearch(query: string) {
    if (query.length >= 2) {
      this.reservationService.getUsersForSearch(query).subscribe();
    }
  }

  onTripSearch(query: string) {
    if (query.length >= 2 && this.selectedAgency()) {
      this.reservationService.getTripsByAgency(
        Number(this.selectedAgency()!.id),
        query
      ).subscribe();
    }
  }

  onAgencySearch(query: string) {
    if (query.length >= 2) {
      // Filter agency items locally
      const filtered = this.agencyItems().filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        (a.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
      );
      // For now, just use local filtering
      // In a full implementation, we'd have a dedicated endpoint
    }
  }

  onPaymentSearch(query: string) {
    // Payments are loaded when user is selected and link to existing payment is enabled
  }

  // ========================================================================
  // DISPLAY HELPERS
  // ========================================================================

  getReservationUser(reservation: Reservation): string {
    return reservation.user?.fullName ?? 'Inconnu';
  }

  getReservationUserPhone(reservation: Reservation): string {
    return reservation.user?.phoneNumber ?? '';
  }

  getReservationRoute(reservation: Reservation): string {
    return reservation.trip?.route ?? 'N/A';
  }

  getReservationDate(reservation: Reservation): string {
    return reservation.trip?.date ? this.reservationService.formatDate(reservation.trip.date) : 'N/A';
  }

  getReservationDeparture(reservation: Reservation): string {
    return reservation.trip?.departure ?? 'N/A';
  }

  getReservationAgency(reservation: Reservation): string {
    return reservation.agency?.name ?? 'N/A';
  }

  getReservationStatus(reservation: Reservation): ReservationStatus {
    return reservation.status;
  }

  getReservationPaymentMethod(reservation: Reservation): string {
    return reservation.paymentMethod;
  }

  // Format reservation date (from createdAt)
  formatReservationDate(dateString: string): string {
    return this.reservationService.formatDate(dateString);
  }

  // Get user initials for avatar
  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // Get avatar color based on user ID (consistent with UserService)
  getAvatarColor(userId: number): string {
    const colors = [
      'bg-rose-500', 'bg-green-500', 'bg-amber-500', 'bg-cyan-500',
      'bg-violet-500', 'bg-pink-500', 'bg-indigo-500', 'bg-emerald-500',
      'bg-teal-500', 'bg-orange-500', 'bg-sky-500', 'bg-lime-500',
    ];
    const index = userId % colors.length;
    return colors[index] ?? 'bg-green-500';
  }

  // Get status label for reservation
  getReservationStatusLabel(reservation: Reservation): string {
    return this.reservationService.getStatusLabel(reservation.status);
  }

  // Get status badge variant for reservation
  getReservationStatusBadgeVariant(reservation: Reservation): 'approved' | 'pending' | 'rejected' | 'missing' | 'verified' {
    return this.reservationService.getStatusBadgeVariant(reservation.status);
  }

  // Get payment method label
  getPaymentMethodLabel(method: string): string {
    return this.reservationService.getPaymentMethodLabel(method);
  }

  // Format date time
  formatDateTime(dateString: string): string {
    return this.reservationService.formatDateTime(dateString);
  }

  // Get ticket status label
  getTicketStatusLabel(status: string): string {
    return this.reservationService.getTicketStatusLabel(status);
  }

  // Get ticket status badge variant
  getTicketStatusBadgeVariant(status: string): 'approved' | 'pending' | 'rejected' {
    return this.reservationService.getTicketStatusBadgeVariant(status);
  }

  // Get transaction status label
  getTransactionStatusLabel(status: string): string {
    return this.reservationService.getTransactionStatusLabel(status);
  }

  // Get payment status label
  getPaymentStatusLabel(status: string): string {
    return this.reservationService.getPaymentStatusLabel(status);
  }
}