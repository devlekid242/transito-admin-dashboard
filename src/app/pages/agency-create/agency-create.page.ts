import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MockDataService, Agency, KycStatus, AccountStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-agency-create',
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: 'agency-create.page.html',
})
export class AgencyCreatePage {
  private data = inject(MockDataService);
  private router = inject(Router);
  readonly currentStep = signal(1);

  readonly steps = [
    { num: 1, title: 'Agence', desc: 'Informations générales' },
    { num: 2, title: 'Administrateur', desc: 'Compte responsable' },
    { num: 3, title: 'Terminé', desc: 'Création' },
  ];

  nextStep() { this.currentStep.set(2); }
  prevStep() { this.currentStep.set(1); }

  createAgency() {
    const form = document.querySelector('form');
    const inputs = document.querySelectorAll('input, textarea');
    const name = (inputs[0] as HTMLInputElement).value;
    const city = (inputs[1] as HTMLInputElement).value;
    const desc = (inputs[2] as HTMLTextAreaElement).value;
    const phone = (inputs[3] as HTMLInputElement).value;
    const email = (inputs[4] as HTMLInputElement).value;
    const adminName = (inputs[5] as HTMLInputElement).value;
    const adminEmail = (inputs[6] as HTMLInputElement).value;
    const adminPhone = (inputs[7] as HTMLInputElement).value;

    if (!name || !city || !phone || !email || !adminName || !adminEmail) return;

    const newId = 'AG-' + String(this.data.agencies().length + 1).padStart(2, '0');
    const newAgency: Agency = {
      id: newId, name, contact: adminName, email, phone, city,
      description: desc || '', kyc: 'PENDING' as KycStatus, account: 'ACTIVE' as AccountStatus,
      createdAt: new Date().toLocaleDateString('fr-FR'),
    };
    this.data.agencies.update(list => [...list, newAgency]);
    this.currentStep.set(3);
  }

  reset() { this.currentStep.set(1); }
}
