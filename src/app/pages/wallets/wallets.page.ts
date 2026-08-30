import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-wallets',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent],
  templateUrl: 'wallets.page.html',
})
export class WalletsPage {
  readonly walletService = inject(WalletService);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'normal' | 'frozen'>('all');
  readonly pageSize = signal(12);

  // Computed totals for KPIs
  readonly totalAvailable = computed(() => this.walletService.totalAvailable());
  readonly totalReserved = computed(() => this.walletService.totalReserved());
  readonly totalBlocked = computed(() => this.walletService.totalBlocked());
  readonly totalWallets = computed(() => this.walletService.totalWallets());
  readonly currentPage = computed(() => this.walletService.currentPage());
  readonly totalPages = computed(() => this.walletService.totalPages());

  // Wallet list
  readonly wallets = computed(() => this.walletService.wallets());

  readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    if (total <= 1) return [1];

    const pages: number[] = [];
    const start = Math.max(1, this.currentPage() - 2);
    const end = Math.min(total, start + 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  str(n: number) { return String(n); }
  fcfa(n: number) { return this.walletService.fcfa(n); }
  initials(name: string) { return this.walletService.getInitials(name); }
  pct(part: number, total: number) { return this.walletService.pct(part, total); }

  constructor() {
    this.loadPage(1);
  }

  private loadPage(page: number = 1) {
    const search = this.searchTerm().trim();
    const filters = {
      search: search || undefined,
      status: this.statusFilter() === 'all' ? 'all' : this.statusFilter(),
    };

    this.walletService.loadWallets(page, this.pageSize(), filters);
  }

  applyFilters() {
    this.loadPage(1);
  }

  resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.loadPage(1);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.loadPage(page);
  }

  // Helper to get total balance (available + reserved)
  totalBalance() {
    return this.totalAvailable() + this.totalReserved();
  }
}
