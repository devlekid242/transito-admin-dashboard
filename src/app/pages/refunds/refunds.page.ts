import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RefundService, RefundRequest, RefundStatus, CreateRefundPayload } from '../../services/refund.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SearchSelectItem } from '../../shared/search-select.component';
import { FormsModule } from "@angular/forms";


@Component({
  selector: 'app-refunds',
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, DataTableComponent, ModalComponent, SearchSelectComponent],
  templateUrl: 'refunds.page.html',
})
export class RefundsPage {
  readonly refundService = inject(RefundService);
  
  // Form state for creating manual refund
  readonly selectedUser = signal<SearchSelectItem | null>(null);
  readonly selectedReservation = signal<SearchSelectItem | null>(null);
  readonly amount = signal(0);
  readonly reason = signal('');
  readonly agency = signal<SearchSelectItem | null>(null);
  readonly formError = signal('');
  readonly formSuccess = signal('');
  
  // Confirmation modal state
  readonly standardRefundConfirmId = signal<number | null>(null);
  readonly forceRefundConfirmId = signal<number | null>(null);
  readonly standardRefundError = signal<string | null>(null);
  readonly forceRefundNote = signal('');

  readonly columns: DataTableColumn[] = [
    { key: 'bookingReference', label: 'Référence' },
    { key: 'clientName', label: 'Client' },
    { key: 'agencyName', label: 'Agence' },
    { key: 'amount', label: 'Montant' },
    { key: 'reason', label: 'Motif' },
    { key: 'status', label: 'Statut' },
    { key: 'createdAt', label: 'Date' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  // Computed properties
  readonly data = computed(() => this.refundService.filteredRefunds());

  str(n: number) { return String(n); }
  fcfa(n: number) { return this.refundService.fcfa(n); }
  
  // KPI counts
  pendingCount() { return this.refundService.totalPending(); }
  refundedCount() { return this.refundService.totalCompleted(); }
  rejectedCount() { return this.refundService.totalRejected(); }
  approvedCount() { return this.refundService.totalApproved(); }
  totalAmountPending() { return this.refundService.totalAmountPending(); }
  
  // Check if any agents have negative balance
  hasInsufficient() { 
    return this.data().some(r => r.hasNegativeBalance); 
  }

  // Get status badge variant based on status
  getStatusVariant(status: RefundStatus): 'pending' | 'approved' | 'rejected' | 'completed' {
    const variantMap: Record<RefundStatus, 'pending' | 'approved' | 'rejected' | 'completed'> = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'COMPLETED': 'approved',
    };
    return variantMap[status] || 'pending';
  }

  getStatusLabel(status: RefundStatus): string {
    const labelMap: Record<RefundStatus, string> = {
      'PENDING': 'En attente',
      'APPROVED': 'Approuvé',
      'REJECTED': 'Rejeté',
      'COMPLETED': 'Terminé',
    };
    return labelMap[status] || status;
  }

  getStatusIcon(status: RefundStatus): string {
    const iconMap: Record<RefundStatus, string> = {
      'PENDING': 'fa-hourglass-half',
      'APPROVED': 'fa-check',
      'REJECTED': 'fa-xmark',
      'COMPLETED': 'fa-check-circle',
    };
    return iconMap[status] || 'fa-question';
  }

  // Check if standard refund is possible
  canStandardRefund(id: number): boolean {
    const refund = this.data().find(r => r.id === id);
    return refund ? refund.canStandardRefund : false;
  }

  // Open create refund modal
  openForm() {
    this.refundService.openCreateModal();
    this.formError.set('');
    this.formSuccess.set('');
    this.resetForm();
  }

  closeForm() {
    this.refundService.closeCreateModal();
    this.resetForm();
  }

  resetForm() {
    this.selectedUser.set(null);
    this.selectedReservation.set(null);
    this.amount.set(0);
    this.reason.set('');
    this.agency.set(null);
    this.formError.set('');
    this.formSuccess.set('');
    this.refundService.resetLookups();
  }

  // Dynamic search handlers for the manual refund creation form.
  // Each is wired to a search-select field in `async` mode: the field
  // debounces keystrokes and emits the raw query text here.
  onUserSearch(query: string) {
    this.refundService.searchClients(query);
  }

  onReservationSearch(query: string) {
    // Scope results to the already-selected client when available, so the
    // admin doesn't have to retype the client's name/reference.
    const userId = this.selectedUser() ? Number(this.selectedUser()!.id) : null;
    this.refundService.searchReservations(query, userId);
  }

  onAgencySearch(query: string) {
    this.refundService.searchAgencies(query);
  }

  // Open confirmation modal for standard refund
  openStandardRefundConfirm(id: number) {
    this.standardRefundConfirmId.set(id);
    this.standardRefundError.set(null);
  }

  closeStandardRefundConfirm() {
    this.standardRefundConfirmId.set(null);
    this.standardRefundError.set(null);
  }

  // Open confirmation modal for force refund
  openForceRefundConfirm(id: number) {
    this.forceRefundConfirmId.set(id);
    this.forceRefundNote.set('');
  }

  closeForceRefundConfirm() {
    this.forceRefundConfirmId.set(null);
    this.forceRefundNote.set('');
  }

  // Process standard refund
  confirmStandardRefund() {
    const id = this.standardRefundConfirmId();
    if (!id) return;

    this.standardRefundError.set(null);
    this.refundService.processStandardRefund(id);
    this.closeStandardRefundConfirm();
  }

  // Process force refund
  confirmForceRefund() {
    const id = this.forceRefundConfirmId();
    if (!id) return;

    const note = this.forceRefundNote();
    this.refundService.processForcedRefund(id, note || 'Remboursement forcé par admin');
    this.closeForceRefundConfirm();
  }

  // Create manual refund
  submitRefund() {
    this.formError.set('');
    
    if (!this.selectedUser()) { 
      this.formError.set('Veuillez sélectionner un utilisateur.'); 
      return; 
    }
    if (!this.selectedReservation()) { 
      this.formError.set('Veuillez sélectionner une réservation.'); 
      return; 
    }
    if (this.amount() <= 0) { 
      this.formError.set('Le montant doit être supérieur à 0.'); 
      return; 
    }
    if (!this.reason().trim()) { 
      this.formError.set('La raison est obligatoire.'); 
      return; 
    }

    const userId = Number(this.selectedUser()!.id);
    const reservationId = Number(this.selectedReservation()!.id);

    if (Number.isNaN(userId) || Number.isNaN(reservationId)) {
      this.formError.set('Utilisateur ou réservation invalide.');
      return;
    }

    const payload: CreateRefundPayload = {
      userId,
      reservationId,
      amount: this.amount(),
      reason: this.reason().trim(),
      adminNote: this.agency() ? `Agence sélectionnée: ${this.agency()!.label}` : undefined,
    };

    this.refundService.createManualRefund(payload);
    this.formSuccess.set('Demande de remboursement créée avec succès.');
    
    // Close form after a delay
    setTimeout(() => {
      this.closeForm();
    }, 1500);
  }

  onUserSelected(item: SearchSelectItem | null) {
    this.selectedUser.set(item);
  }

  onAgencySelected(item: SearchSelectItem | null) {
    this.agency.set(item);
  }

  onReservationSelected(item: SearchSelectItem | null) {
    this.selectedReservation.set(item);

    // Convenience: prefill the amount from the reservation's total when the
    // admin hasn't already entered one manually.
    if (item && this.amount() === 0 && typeof item['totalAmount'] === 'number') {
      this.amount.set(item['totalAmount']);
    }
  }

  // Load data on component initialization
  constructor() {
    // Load refunds when component initializes
    this.refundService.loadRefunds();
  }

  // Refresh the list
  refresh() {
    this.refundService.refresh();
  }

  // Search handler
  onSearch(search: string) {
    this.refundService.filters.update(f => ({ ...f, search }));
  }

  // Status filter handler
  onStatusFilter(status: RefundStatus | 'ALL') {
    this.refundService.filters.update(f => ({ ...f, status }));
  }

  // Check if refund can be processed with standard method
  checkRefundProcessable(refund: RefundRequest): boolean {
    return refund.status === 'PENDING' && refund.canStandardRefund;
  }

  // Check if refund requires force
  checkRequiresForce(refund: RefundRequest): boolean {
    return refund.status === 'PENDING' && !refund.canStandardRefund;
  }

  // Check if refund is already processed
  isProcessed(refund: RefundRequest): boolean {
    return refund.status === 'COMPLETED' || refund.status === 'REJECTED' || refund.status === 'APPROVED';
  }
}