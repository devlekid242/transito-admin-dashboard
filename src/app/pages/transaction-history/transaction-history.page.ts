import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService, TransactionType } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-transaction-history',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'transaction-history.page.html',
})
export class TransactionHistoryPage {
  readonly data = inject(MockDataService);
  readonly search = signal('');
  readonly type = signal<'ALL' | TransactionType>('ALL');

  get ts() { return this.data.transactionTypeStats; }
  fcfa(n: number) { return this.data.fcfa(n); }
  str(n: number) { return String(n); }

  filtered() {
    const s = this.search().toLowerCase().trim();
    const t = this.type();
    return this.data.transactions().filter(tx => {
      const matchType = t === 'ALL' || tx.type === t;
      const matchSearch = !s || tx.id.toLowerCase().includes(s) || tx.agency.toLowerCase().includes(s) || (tx.user?.toLowerCase().includes(s) ?? false) || tx.label.toLowerCase().includes(s);
      return matchType && matchSearch;
    });
  }

  onTypeChange(value: string) { this.type.set(value as 'ALL' | TransactionType); }

  typeLabel(type: TransactionType): string {
    const map: Record<TransactionType, string> = { PAYMENT: 'Paiement', WITHDRAWAL: 'Retrait', REFUND: 'Remboursement', COMMISSION: 'Commission', TOPUP: 'Recharge' };
    return map[type];
  }
}
