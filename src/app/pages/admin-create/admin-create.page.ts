import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService, AdminUser, AdminRole } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-admin-create',
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: 'admin-create.page.html',
})
export class AdminCreatePage {
  private data = inject(MockDataService);
  readonly currentStep = signal(1);
  readonly selectedRole = signal<AdminRole>('FINANCE');

  readonly steps = [
    { num: 1, title: 'Informations', desc: 'Identité' },
    { num: 2, title: 'Rôle', desc: 'Permissions' },
    { num: 3, title: 'Sécurité', desc: 'Mot de passe & 2FA' },
    { num: 4, title: 'Terminé', desc: 'Création' },
  ];

  readonly roleOptions = [
    { value: 'FINANCE' as AdminRole, label: 'Finance', desc: 'Gère les retraits, remboursements et finances' },
    { value: 'MODERATION' as AdminRole, label: 'Modération', desc: 'Gère les agences, KYC et utilisateurs' },
    { value: 'SUPPORT' as AdminRole, label: 'Support', desc: 'Répond aux tickets de support' },
  ];

  readonly permissionOptions = [
    'Voir finances', 'Valider retraits', 'Forcer remboursements',
    'Gérer agences', 'Valider KYC', 'Gérer utilisateurs',
    'Répondre tickets', 'Voir utilisateurs', 'Envoyer notifications',
  ];

  nextStep() { this.currentStep.update(v => Math.min(v + 1, 4)); }
  prevStep() { this.currentStep.update(v => Math.max(v - 1, 1)); }

  createAdmin() {
    const inputs = document.querySelectorAll('input');
    const name = (inputs[0] as HTMLInputElement).value;
    const email = (inputs[1] as HTMLInputElement).value;
    if (!name || !email) return;

    const colors = ['bg-emerald-600', 'bg-amber-600', 'bg-cyan-600', 'bg-violet-600', 'bg-rose-600'];
    const permMap: Record<string, string[]> = {
      FINANCE: ['Voir finances', 'Valider retraits', 'Forcer remboursements'],
      MODERATION: ['Gérer agences', 'Valider KYC', 'Gérer utilisateurs'],
      SUPPORT: ['Répondre tickets', 'Voir utilisateurs'],
    };

    const newAdmin: AdminUser = {
      id: 'A-' + (this.data.admins().length + 1),
      name, email, role: this.selectedRole(),
      lastActive: 'Jamais', avatarColor: colors[Math.floor(Math.random() * colors.length)],
      permissions: permMap[this.selectedRole()] || [],
    };
    this.data.admins.update(list => [...list, newAdmin]);
    this.currentStep.set(4);
  }

  reset() { this.currentStep.set(1); }
}
