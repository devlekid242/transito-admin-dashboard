import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { ModalComponent } from '../../shared/modal.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-platform-wallet',
  imports: [CommonModule, RouterLink, FormsModule, ModalComponent, PageHeaderComponent, StatCardComponent],
  templateUrl: 'platform-wallet.page.html',
})
export class PlatformWalletPage {
  readonly walletService = inject(WalletService);

  // Filtres du ledger
  readonly sourceFilter = signal('');
  readonly typeFilter = signal<'' | 'CREDIT' | 'DEBIT'>('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly pageSize = 20;

  // Modales d'ajustement manuel
  showCreditModal = false;
  showDebitModal = false;
  creditAmount = '';
  creditReason = '';
  debitAmount = '';
  debitReason = '';

  readonly detail = computed(() => this.walletService.platformDetail());
  readonly loading = computed(() => this.walletService.platformLoading());
  readonly error = computed(() => this.walletService.platformError());
  readonly currentPage = computed(() => this.walletService.platformPage());
  readonly totalPages = computed(() => this.walletService.platformTotalPages());
  readonly total = computed(() => this.walletService.platformTotal());

  readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    if (total <= 1) return [1];
    const start = Math.max(1, this.currentPage() - 2);
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  constructor() {
    this.load(1);
  }

  fcfa(n: number) { return this.walletService.fcfa(n); }
  label(source: string) { return this.walletService.sourceLabel(source); }
  toFloat(v: string) { return parseFloat(v); }

  private load(page: number) {
    this.walletService.loadPlatformWallet(page, this.pageSize, {
      source: this.sourceFilter() || undefined,
      type: this.typeFilter() || undefined,
      from: this.fromDate() || undefined,
      to: this.toDate() || undefined,
    });
  }

  applyFilters() { this.load(1); }

  resetFilters() {
    this.sourceFilter.set('');
    this.typeFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.load(1);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.load(page);
  }

  refresh() { this.walletService.refreshPlatformWallet(); }

  // Actions manuelles : réutilisent /admin/wallets/{id}/credit|debit
  creditWallet() {
    const id = this.detail()?.wallet.id;
    const amount = parseFloat(this.creditAmount);
    if (id && !isNaN(amount) && amount > 0 && this.creditReason.trim()) {
      this.walletService.creditWallet(id, amount, this.creditReason.trim());
      this.showCreditModal = false;
      this.creditAmount = '';
      this.creditReason = '';
    }
  }

  debitWallet() {
    const id = this.detail()?.wallet.id;
    const amount = parseFloat(this.debitAmount);
    if (id && !isNaN(amount) && amount > 0 && this.debitReason.trim()) {
      this.walletService.debitWallet(id, amount, this.debitReason.trim());
      this.showDebitModal = false;
      this.debitAmount = '';
      this.debitReason = '';
    }
  }

  openCreditModal() { this.showCreditModal = true; }
  closeCreditModal() { this.showCreditModal = false; }
  openDebitModal() { this.showDebitModal = true; }
  closeDebitModal() { this.showDebitModal = false; }
}