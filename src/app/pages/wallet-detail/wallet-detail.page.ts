import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WalletService, WalletDetailResponse } from '../../services/wallet.service';
import { ModalComponent } from '../../shared/modal.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-wallet-detail',
  imports: [CommonModule, RouterLink, ModalComponent, PageHeaderComponent, StatCardComponent, StatusBadgeComponent, FormsModule],
  templateUrl: 'wallet-detail.page.html',
})
export class WalletDetailPage {
  readonly walletService = inject(WalletService);
  private route = inject(ActivatedRoute);
  readonly walletId = this.route.snapshot.paramMap.get('id') || '';

  // Local state for modals and forms
  showCreditModal = false;
  showDebitModal = false;
  showFreezeModal = false;
  showUnfreezeModal = false;
  
  creditAmount = '';
  creditReason = '';
  debitAmount = '';
  debitReason = '';
  freezeReason = '';
  unfreezeReason = '';

  constructor() {
    // Load wallet detail when component initializes
    const id = parseInt(this.walletId);
    if (!isNaN(id)) {
      this.walletService.loadWalletDetail(id);
    }
  }

  readonly detail = computed(() => this.walletService.getWalletDetail());
  
  readonly inCount = computed(() => {
    const d = this.detail();
    return d?.transactions.filter(t => t.amount > 0).length ?? 0;
  });
  
  readonly outCount = computed(() => {
    const d = this.detail();
    return d?.transactions.filter(t => t.amount < 0).length ?? 0;
  });

  fcfa(n: number) { return this.walletService.fcfa(n); }
  str(n: number) { return String(n); }
  toFloat(v: string) { return parseFloat(v); }
  initials(name: string) { return this.walletService.getInitials(name); }
  pct(part: number, total: number) { return this.walletService.pct(part, total); }

  typeLabel(type: string): string {
    const map: Record<string, string> = { 
      RESERVATION_PAYMENT: 'Paiement réservation', 
      PLATFORM_FEE: 'Commission plateforme', 
      REFUND: 'Remboursement', 
      WITHDRAWAL_HOLD: 'Réservation retrait',
      WITHDRAWAL_COMPLETED: 'Retrait compléter',
      WITHDRAWAL_RELEASED: 'Retrait libéré',
      ADMIN_CREDIT: 'Crédit manuel',
      ADMIN_DEBIT: 'Débit manuel',
      WALLET_FREEZE: 'Portefeuille gelé',
      WALLET_UNFREEZE: 'Portefeuille dégélé',
      ADJUSTMENT: 'Ajustement'
    };
    return map[type] || type;
  }

  // Freeze wallet with confirmation
  freezeWallet() {
    const id = parseInt(this.walletId);
    if (!isNaN(id)) {
      this.walletService.freezeWallet(id, this.freezeReason || undefined);
      this.showFreezeModal = false;
      this.freezeReason = '';
    }
  }

  // Unfreeze wallet with confirmation
  unfreezeWallet() {
    const id = parseInt(this.walletId);
    if (!isNaN(id)) {
      this.walletService.unfreezeWallet(id, this.unfreezeReason || undefined);
      this.showUnfreezeModal = false;
      this.unfreezeReason = '';
    }
  }

  // Credit wallet with confirmation
  creditWallet() {
    const id = parseInt(this.walletId);
    const amount = parseFloat(this.creditAmount);
    if (!isNaN(id) && !isNaN(amount) && amount > 0) {
      this.walletService.creditWallet(id, amount, this.creditReason);
      this.showCreditModal = false;
      this.creditAmount = '';
      this.creditReason = '';
    }
  }

  // Debit wallet with confirmation
  debitWallet() {
    const id = parseInt(this.walletId);
    const amount = parseFloat(this.debitAmount);
    if (!isNaN(id) && !isNaN(amount) && amount > 0) {
      this.walletService.debitWallet(id, amount, this.debitReason);
      this.showDebitModal = false;
      this.debitAmount = '';
      this.debitReason = '';
    }
  }

  // Modal control
  openCreditModal() { this.showCreditModal = true; }
  closeCreditModal() { this.showCreditModal = false; }
  openDebitModal() { this.showDebitModal = true; }
  closeDebitModal() { this.showDebitModal = false; }
  openFreezeModal() { this.showFreezeModal = true; }
  closeFreezeModal() { this.showFreezeModal = false; }
  openUnfreezeModal() { this.showUnfreezeModal = true; }
  closeUnfreezeModal() { this.showUnfreezeModal = false; }

  // Check if wallet is frozen
  isFrozen() { 
    return this.detail()?.wallet.frozen ?? false; 
  }

  // Refresh detail
  refresh() {
    const id = parseInt(this.walletId);
    if (!isNaN(id)) {
      this.walletService.loadWalletDetail(id);
    }
  }
}