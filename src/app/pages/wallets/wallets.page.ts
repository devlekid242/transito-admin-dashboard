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

  // Computed totals for KPIs
  readonly totalAvailable = computed(() => this.walletService.totalAvailable());
  readonly totalReserved = computed(() => this.walletService.totalReserved());
  readonly totalBlocked = computed(() => this.walletService.totalBlocked());
  readonly totalWallets = computed(() => this.walletService.totalWallets());
  
  // Wallet list
  readonly wallets = computed(() => this.walletService.wallets());

  str(n: number) { return String(n); }
  fcfa(n: number) { return this.walletService.fcfa(n); }
  initials(name: string) { return this.walletService.getInitials(name); }
  pct(part: number, total: number) { return this.walletService.pct(part, total); }

  constructor() {
    // Load wallets on component initialization
    this.walletService.loadWallets();
  }

  // Helper to get total balance (available + reserved)
  totalBalance() {
    return this.totalAvailable() + this.totalReserved();
  }
}
