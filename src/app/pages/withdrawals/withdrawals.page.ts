import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WithdrawalService, Withdrawal, WithdrawalStatus } from '../../services/withdrawal.service';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { FormsModule } from '@angular/forms';

type FilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-withdrawals',
  imports: [CommonModule, StatusBadgeComponent, PageHeaderComponent, DataTableComponent, FormsModule],
  templateUrl: 'withdrawals.page.html',
})
export class WithdrawalsPage implements OnInit {
  readonly withdrawalService = inject(WithdrawalService);
  readonly activeTab = signal<FilterTab>('ALL');
  readonly rejectTarget = signal<Withdrawal | null>(null);

  // DataTable columns
  readonly columns: DataTableColumn[] = [
    { key: 'agency', label: 'Agence' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Montant', align: 'right' },
    { key: 'remainingBalance', label: 'Solde restant', align: 'right' },
    { key: 'status', label: 'Statut' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  // Search keys for DataTable
  readonly searchKeys = ['agencyName', 'status', 'method'];

  readonly tabs: { key: FilterTab; label: string }[] = [
    { key: 'ALL', label: 'Toutes' },
    { key: 'PENDING', label: 'En attente' },
    { key: 'APPROVED', label: 'Approuvées' },
    { key: 'REJECTED', label: 'Rejetées' },
  ];

  // Computed data for filtered withdrawals
  readonly filtered = computed<Withdrawal[]>(() => {
    const all = this.withdrawalService.withdrawals();
    // console.log(all);
    const tab = this.activeTab();
    return tab === 'ALL' ? all : all.filter((w) => w.status === tab);
  });

  ngOnInit(): void {
    // Déclenche la requête initiale GET /api/admin/withdrawals — sans ça, le signal
    // `withdrawals` reste vide et aucun appel réseau n'est jamais fait.
    this.withdrawalService.loadWithdrawals();
  }

  countFor(tab: FilterTab): number {
    const all = this.withdrawalService.withdrawals();
    return tab === 'ALL' ? all.length : all.filter((w) => w.status === tab).length;
  }

  fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
    }).format(n);
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  openReject(w: Withdrawal) {
    this.rejectTarget.set(w);
  }

  closeReject() {
    this.rejectTarget.set(null);
  }

  confirmReject(note: string) {
    const target = this.rejectTarget();
    if (!target) return;
    this.withdrawalService.rejectWithdrawal(target.id, note);
    this.closeReject();
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Step 1: agent clicks "Approuver" in the row -> check solvency, then open the confirmation modal
  handleApproveWithCheck(w: Withdrawal) {
    this.withdrawalService.checkSolvency(w.id);
    this.withdrawalService.openApproveModal(w.id);
  }

  // Helper method to get withdrawal by ID
  getWithdrawalForModal(id: number): Withdrawal | null {
    return this.withdrawalService.getWithdrawal(id);
  }

  // Step 2: confirm approval from the approve modal.
  // If the backend rejects due to insolvency, open the force-pay warning modal automatically.
  confirmApprove(adminNote: string) {
    const withdrawalId = this.withdrawalService.showApproveModal();
    if (!withdrawalId) return;

    this.withdrawalService.approveWithdrawalWithSolvency(withdrawalId, adminNote, false, (result) => {
      if (!result.success) {
        this.withdrawalService.openSolvencyWarningModal(
          withdrawalId,
          result.message || 'Risque financier détecté pour cette agence.',
        );
      }
    });

    this.withdrawalService.closeApproveModal();
  }

  // Step 3: confirm force approve from the solvency warning modal (bypasses the solvency check)
  confirmForceApprove(adminNote: string) {
    const withdrawalId = this.withdrawalService.showSolvencyWarningModal();
    if (!withdrawalId) return;

    this.withdrawalService.approveWithForcePay(withdrawalId, adminNote);
    this.withdrawalService.closeSolvencyWarningModal();
  }
}