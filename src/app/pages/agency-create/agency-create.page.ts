import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService, Agency, AgencyCreateInput } from '../../services/agency.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-agency-create',
  imports: [CommonModule, RouterLink, FormsModule, PageHeaderComponent],
  templateUrl: 'agency-create.page.html',
})
export class AgencyCreatePage implements OnInit {
  private readonly agencyService = inject(AgencyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentStep = signal(1);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly isSubmitting = signal(false);
  readonly isEditing = signal(false);
  readonly agencyId = signal<number | null>(null);

  // Form data
  agencyForm = {
    name: '',
    email: '',
    phone: '',
    passwordHash: '',
    registrationNumber: '',
    address: '',
    description: '',
    commissionRate: '10.00',
    status: 'pending' as 'pending' | 'active' | 'suspended',
    logoUrl: '',
    bannerUrl: '',
    websiteUrl: '',
    mapUrl: '',
  };

  adminForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
  };

  readonly steps = [
    { num: 1, title: 'Agence', desc: 'Informations generales' },
    { num: 2, title: 'Administrateur', desc: 'Compte responsable' },
    { num: 3, title: 'Termine', desc: 'Creation' },
  ];

  constructor() {
    // Check if we're editing
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.agencyId.set(Number(id));
      this.loadAgency(Number(id));
    }
  }

  ngOnInit() {
    // If editing, set step to 1
    if (this.isEditing()) {
      this.currentStep.set(1);
    }
  }

  private loadAgency(id: number) {
    this.agencyService.getAgency(id).subscribe(response => {
      if (response.success && response.data) {
        const agency = response.data as Agency;
        this.agencyForm = {
          name: agency.name,
          email: agency.email,
          phone: agency.phone,
          passwordHash: '', // Don't show password
          registrationNumber: agency.registrationNumber || '',
          address: agency.address || '',
          description: agency.description || '',
          commissionRate: agency.commissionRate,
          status: agency.status,
          logoUrl: agency.logoUrl || '',
          bannerUrl: agency.bannerUrl || '',
          websiteUrl: agency.websiteUrl || '',
          mapUrl: agency.mapUrl || '',
        };
      }
    });
  }

  nextStep() {
    if (this.validateStep1()) {
      this.currentStep.set(2);
      this.error.set(null);
    } else {
      this.error.set('Veuillez remplir tous les champs obligatoires pour l\'agence.');
    }
  }

  prevStep() {
    this.currentStep.set(1);
    this.error.set(null);
  }

  validateStep1(): boolean {
    const form = this.agencyForm;
    return !!form.name && !!form.email && !!form.phone;
  }

  validateStep2(): boolean {
    const admin = this.adminForm;
    return !!admin.name && !!admin.email && !!admin.phone && !!admin.password;
  }

  createOrUpdateAgency() {
    if (!this.validateStep1()) {
      this.error.set('Veuillez remplir tous les champs obligatoires pour l\'agence.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const agencyData: AgencyCreateInput = {
      name: this.agencyForm.name,
      email: this.agencyForm.email,
      phone: this.agencyForm.phone,
      passwordHash: this.agencyForm.passwordHash || this.adminForm.password,
      registrationNumber: this.agencyForm.registrationNumber,
      address: this.agencyForm.address,
      description: this.agencyForm.description,
      commissionRate: this.agencyForm.commissionRate,
      status: this.agencyForm.status,
      logoUrl: this.agencyForm.logoUrl,
      bannerUrl: this.agencyForm.bannerUrl,
      websiteUrl: this.agencyForm.websiteUrl,
      mapUrl: this.agencyForm.mapUrl,
    };

    if (this.isEditing()) {
      // Update existing agency
      const id = this.agencyId();
      if (id) {
        this.agencyService.updateAgency(id, agencyData).subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            if (response.success) {
              this.currentStep.set(3);
              this.success.set(true);
            } else {
              this.error.set(response.message || 'Erreur lors de la mise a jour de l\'agence.');
            }
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.error.set(err.error?.message || 'Erreur lors de la mise a jour de l\'agence.');
          }
        });
      }
    } else {
      // Create new agency
      this.agencyService.createAgency(agencyData).subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          if (response.success) {
            this.currentStep.set(3);
            this.success.set(true);
            // Reset form
            this.reset();
          } else {
            this.error.set(response.message || 'Erreur lors de la creation de l\'agence.');
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(err.error?.message || 'Erreur lors de la creation de l\'agence.');
        }
      });
    }
  }

  reset() {
    this.currentStep.set(1);
    this.success.set(false);
    this.error.set(null);
    this.isEditing.set(false);
    this.agencyId.set(null);
    this.agencyForm = {
      name: '',
      email: '',
      phone: '',
      passwordHash: '',
      registrationNumber: '',
      address: '',
      description: '',
      commissionRate: '10.00',
      status: 'pending',
      logoUrl: '',
      bannerUrl: '',
      websiteUrl: '',
      mapUrl: '',
    };
    this.adminForm = {
      name: '',
      email: '',
      phone: '',
      password: '',
    };
  }

  updateField(field: string, value: string) {
    (this.agencyForm as any)[field] = value;
  }

  updateAdminField(field: string, value: string) {
    (this.adminForm as any)[field] = value;
  }

  formatCurrency(amount: number) {
    return this.agencyService.formatCurrency(amount);
  }

  getPageTitle(): string {
    return this.isEditing() ? 'Modifier une agence' : 'Creer une agence';
  }

  getButtonText(): string {
    return this.isEditing() ? 'Mettre a jour l\'agence' : 'Creer l\'agence';
  }

  getSuccessMessage(): string {
    return this.isEditing() 
      ? 'Agence mise a jour avec succes'
      : 'Agence cree avec succes';
  }
}
