import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-system-settings',
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: 'system-settings.page.html',
})
export class SystemSettingsPage {
  readonly data = inject(MockDataService);
  readonly platformFee = signal(350);
  readonly feeSaved = signal(false);
  readonly activeTab = signal<'commission' | 'payments' | 'platform' | 'security' | 'audit'>('commission');

  readonly tabs = [
    { id: 'commission' as const, label: 'Commission', icon: 'fa-percent' },
    { id: 'payments' as const, label: 'Paiements', icon: 'fa-credit-card' },
    { id: 'platform' as const, label: 'Plateforme', icon: 'fa-globe' },
    { id: 'security' as const, label: 'Sécurité', icon: 'fa-lock' },
    { id: 'audit' as const, label: 'Audit', icon: 'fa-clock-rotate-left' },
  ];

  readonly paymentMethods = signal([
    { name: 'Wave', icon: 'fa-wave-square', enabled: signal(true) },
    { name: 'Orange Money', icon: 'fa-mobile-screen-button', enabled: signal(true) },
    { name: 'Carte bancaire', icon: 'fa-credit-card', enabled: signal(true) },
  ]);

  readonly securitySettings = signal([
    { name: '2FA obligatoire', desc: 'Authentification à deux facteurs pour les admins', enabled: signal(true) },
    { name: 'Auto-déconnexion', desc: 'Déconnexion après 30 min d\'inactivité', enabled: signal(true) },
    { name: 'IP whitelist', desc: 'Restreindre l\'accès à certaines IP', enabled: signal(false) },
  ]);

  fcfa(n: number) { return this.data.fcfa(n); }

  updateFee(value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0) {
      this.platformFee.set(n);
      this.feeSaved.set(true);
      setTimeout(() => this.feeSaved.set(false), 3000);
    }
  }
}
