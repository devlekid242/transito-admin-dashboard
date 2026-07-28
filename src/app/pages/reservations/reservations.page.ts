import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService, ReservationStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SearchSelectItem } from '../../shared/search-select.component';

@Component({
  selector: 'app-reservations',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, DataTableComponent, ModalComponent, SearchSelectComponent],
  templateUrl: 'reservations.page.html',
})
export class ReservationsPage {
  readonly data = inject(MockDataService);
  readonly showForm = signal(false);
  readonly formError = signal('');
  readonly formSuccess = signal('');

  // Form fields
  readonly selectedUser = signal<SearchSelectItem | null>(null);
  readonly agency = signal('');
  readonly route = signal('');
  readonly date = signal('');
  readonly departure = signal('');
  readonly seats = signal(1);
  readonly amount = signal(0);
  readonly paymentMethod = signal('Wave');

  readonly userItems = computed<SearchSelectItem[]>(() =>
    this.data.users().map(u => ({ id: u.id, label: u.name, sublabel: u.email }))
  );

  readonly columns: DataTableColumn[] = [
    { key: 'ref', label: 'Référence' },
    { key: 'passenger', label: 'Passager' },
    { key: 'agency', label: 'Agence' },
    { key: 'route', label: 'Trajet' },
    { key: 'date', label: 'Date' },
    { key: 'seats', label: 'Places' },
    { key: 'amount', label: 'Montant' },
    { key: 'paymentMethod', label: 'Paiement' },
    { key: 'status', label: 'Statut' },
  ];

  get rs() { return this.data.reservationStats; }
  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }

  openForm() {
    this.showForm.set(true);
    this.formError.set('');
    this.formSuccess.set('');
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedUser.set(null);
    this.agency.set('');
    this.route.set('');
    this.date.set('');
    this.departure.set('');
    this.seats.set(1);
    this.amount.set(0);
    this.paymentMethod.set('Wave');
    this.formError.set('');
  }

  onUserSelected(item: SearchSelectItem | null) {
    this.selectedUser.set(item);
  }

  submitReservation() {
    this.formError.set('');
    if (!this.selectedUser()) { this.formError.set('Veuillez sélectionner un client.'); return; }
    if (!this.agency()) { this.formError.set('Veuillez sélectionner une agence.'); return; }
    if (!this.route().trim()) { this.formError.set('Veuillez saisir le trajet.'); return; }
    if (!this.date().trim()) { this.formError.set('Veuillez saisir la date.'); return; }
    if (!this.departure().trim()) { this.formError.set('Veuillez saisir l\'heure de départ.'); return; }
    if (this.seats() < 1) { this.formError.set('Le nombre de places doit être au moins 1.'); return; }
    if (this.amount() <= 0) { this.formError.set('Le montant doit être supérieur à 0.'); return; }

    const user = this.selectedUser()!;
    const newId = 'R-' + (1000 + this.data.reservations().length + 1);
    const newRef = 'TKT-' + (55210 + this.data.reservations().length + 1);
    this.data.reservations.update(list => [
      {
        id: newId,
        ref: newRef,
        passenger: user.label,
        agency: this.agency(),
        route: this.route().trim(),
        date: this.date().trim(),
        departure: this.departure().trim(),
        seats: this.seats(),
        amount: this.amount(),
        status: 'CONFIRMED' as ReservationStatus,
        paymentMethod: this.paymentMethod(),
      },
      ...list,
    ]);
    this.formSuccess.set('Réservation créée avec succès.');
    setTimeout(() => this.closeForm(), 1500);
  }
}
