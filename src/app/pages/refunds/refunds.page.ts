import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService, User } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SearchSelectItem } from '../../shared/search-select.component';

@Component({
  selector: 'app-refunds',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, DataTableComponent, ModalComponent, SearchSelectComponent],
  templateUrl: 'refunds.page.html',
})
export class RefundsPage {
  readonly data = inject(MockDataService);
  readonly showForm = signal(false);
  readonly selectedUser = signal<SearchSelectItem | null>(null);
  readonly ticketRef = signal('');
  readonly amount = signal(0);
  readonly reason = signal('');
  readonly agency = signal('');
  readonly formError = signal('');
  readonly formSuccess = signal('');

  readonly userItems = computed<SearchSelectItem[]>(() =>
    this.data.users().map(u => ({ id: u.id, label: u.name, sublabel: u.email }))
  );

  readonly agencyItems = computed<SearchSelectItem[]>(() =>
    this.data.agencies().map(a => ({ id: a.id, label: a.name, sublabel: a.city }))
  );

  readonly columns: DataTableColumn[] = [
    { key: 'ticketRef', label: 'Ticket' },
    { key: 'passenger', label: 'Passager' },
    { key: 'agency', label: 'Agence' },
    { key: 'amount', label: 'Montant' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Statut' },
    { key: 'actions', label: 'Action', align: 'right' },
  ];

  str(n: number) { return String(n); }
  fcfa(n: number) { return this.data.fcfa(n); }
  pendingCount() { return this.data.refunds().filter(r => r.status === 'REFUND_PENDING').length; }
  refundedCount() { return this.data.refunds().filter(r => r.status === 'REFUNDED').length; }
  blockedCount() { return this.data.refunds().filter(r => r.status === 'BLOCKED').length; }
  hasInsufficient() { return this.data.refunds().some(r => r.insufficientFunds && r.status === 'REFUND_PENDING'); }

  forceRefund(id: string) {
    this.data.refunds.update(list => list.map(r => r.id === id ? { ...r, status: 'REFUNDED' as const, insufficientFunds: false } : r));
  }

  openForm() {
    this.showForm.set(true);
    this.formError.set('');
    this.formSuccess.set('');
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedUser.set(null);
    this.ticketRef.set('');
    this.amount.set(0);
    this.reason.set('');
    this.agency.set('');
    this.formError.set('');
  }

  onUserSelected(item: SearchSelectItem | null) {
    this.selectedUser.set(item);
  }

  submitRefund() {
    this.formError.set('');
    if (!this.selectedUser()) { this.formError.set('Veuillez sélectionner un utilisateur.'); return; }
    if (!this.ticketRef().trim()) { this.formError.set('Veuillez saisir la référence du ticket.'); return; }
    if (this.amount() <= 0) { this.formError.set('Le montant doit être supérieur à 0.'); return; }
    if (!this.agency()) { this.formError.set('Veuillez sélectionner une agence.'); return; }

    const user = this.selectedUser()!;
    const newId = 'R-' + (300 + this.data.refunds().length + 1);
    this.data.refunds.update(list => [
      {
        id: newId,
        ticketRef: this.ticketRef().trim(),
        passenger: user.label,
        agency: this.agency(),
        amount: this.amount(),
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'REFUND_PENDING' as const,
        insufficientFunds: false,
      },
      ...list,
    ]);
    this.formSuccess.set('Remboursement initié avec succès.');
    setTimeout(() => this.closeForm(), 1500);
  }
}
