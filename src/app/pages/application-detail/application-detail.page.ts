import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService, ApplicationStatus } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-application-detail',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, ModalComponent],
  templateUrl: 'application-detail.page.html',
})
export class ApplicationDetailPage {
  readonly data = inject(MockDataService);
  private route = inject(ActivatedRoute);

  readonly appId = this.route.snapshot.paramMap.get('id') || '';
  readonly app = computed(() => this.data.applications().find(a => a.id === this.appId) || null);

  readonly showRejectModal = signal(false);
  readonly rejectReason = signal('');
  readonly showApproveModal = signal(false);

  readonly docIcons: Record<string, string> = {
    RCCM: 'fa-file-contract',
    NINEA: 'fa-file-lines',
    ASSURANCE: 'fa-shield-halved',
    CARTE_GRISE: 'fa-car',
    CONTRAT: 'fa-file-signature',
    AUTRE: 'fa-file',
  };

  docIcon(type: string) { return this.docIcons[type] || 'fa-file'; }

  approve() {
    this.showApproveModal.set(false);
    this.data.applications.update(list => list.map(a =>
      a.id === this.appId ? { ...a, status: 'APPROVED' as ApplicationStatus, reviewedAt: new Date().toLocaleDateString('fr-FR'), reviewer: 'Admin Tansico' } : a
    ));
  }

  reject() {
    if (!this.rejectReason().trim()) return;
    this.data.applications.update(list => list.map(a =>
      a.id === this.appId ? { ...a, status: 'REJECTED' as ApplicationStatus, reviewedAt: new Date().toLocaleDateString('fr-FR'), reviewer: 'Admin Tansico', rejectionReason: this.rejectReason() } : a
    ));
    this.showRejectModal.set(false);
    this.rejectReason.set('');
  }
}
