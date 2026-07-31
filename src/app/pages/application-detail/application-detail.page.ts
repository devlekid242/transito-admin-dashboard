import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApplicationService, ApplicationDetail, ApplicationStatus, RejectApplicationDto, ApproveApplicationDto } from '../../services/application.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-application-detail',
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, ModalComponent],
  templateUrl: 'application-detail.page.html',
})
export class ApplicationDetailPage implements OnInit {
  readonly applicationService = inject(ApplicationService);
  private route = inject(ActivatedRoute);

  readonly appId = Number(this.route.snapshot.paramMap.get('id')) || 0;
  readonly app = this.applicationService.currentApplication;
  readonly loading = this.applicationService.loadingDetail;
  readonly loadingAction = this.applicationService.loadingAction;
  readonly actionSuccess = this.applicationService.actionSuccess;
  readonly actionError = this.applicationService.actionError;

  readonly showRejectModal = signal(false);
  readonly rejectReason = signal('');
  readonly showApproveModal = signal(false);
  readonly reviewerNotes = signal('');

  constructor() {}

  ngOnInit(): void {
    if (this.appId > 0) {
      this.applicationService.getApplicationDetail(this.appId).subscribe();
      this.applicationService.getDocumentTypeOptions().subscribe();
    }
  }

  // Get document type icon
  docIcon(type: string) { 
    return this.applicationService.getDocumentTypeIcon(type as any); 
  }

  // Get document type label
  docLabel(type: string) { 
    return this.applicationService.getDocumentTypeLabel(type as any); 
  }

  // Get status badge variant
  getStatusBadgeVariant(status: ApplicationStatus): 'pending' | 'info' | 'approved' | 'rejected' {
    return this.applicationService.getStatusBadgeVariant(status);
  }

  // Get status label
  getStatusLabel(status: ApplicationStatus): string {
    return this.applicationService.getStatusLabel(status);
  }

  // Get status icon
  getStatusIcon(status: ApplicationStatus): string {
    switch (status) {
      case 'PENDING': return 'fa-clock';
      case 'UNDER_REVIEW': return 'fa-magnifying-glass';
      case 'APPROVED': return 'fa-circle-check';
      case 'REJECTED': return 'fa-circle-xmark';
      default: return 'fa-clock';
    }
  }

  // Check if application has all required documents
  hasAllRequiredDocuments(): boolean {
    const application = this.app();
    if (!application) return false;
    return this.applicationService.hasAllRequiredDocuments(application);
  }

  // Get missing document types
  getMissingDocumentTypes() {
    const application = this.app();
    if (!application) return [];
    return this.applicationService.getMissingDocumentTypes(application);
  }

  // Format date
  formatDate(dateString: string): string {
    return this.applicationService.formatDate(dateString);
  }

  // Format date time
  formatDateTime(dateString: string): string {
    return this.applicationService.formatDateTime(dateString);
  }

  // Start review
  startReview() {
    if (this.appId > 0) {
      this.applicationService.startReview(this.appId).subscribe();
    }
  }

  // Approve application
  approve() {
    const data: ApproveApplicationDto = {
      reviewerNotes: this.reviewerNotes(),
    };
    
    if (this.appId > 0) {
      this.applicationService.approveApplication(this.appId, data).subscribe({
        next: (response) => {
          if (response.success) {
            this.showApproveModal.set(false);
            this.reviewerNotes.set('');
          }
        },
        error: (error) => {
          console.error('Error approving application:', error);
        }
      });
    }
  }

  // Reject application
  reject() {
    if (!this.rejectReason().trim()) return;
    
    const data: RejectApplicationDto = {
      rejectionReason: this.rejectReason(),
      reviewerNotes: '',
    };
    
    if (this.appId > 0) {
      this.applicationService.rejectApplication(this.appId, data).subscribe({
        next: (response) => {
          if (response.success) {
            this.showRejectModal.set(false);
            this.rejectReason.set('');
          }
        },
        error: (error) => {
          console.error('Error rejecting application:', error);
        }
      });
    }
  }

  // Clear action messages
  clearMessages() {
    this.applicationService.clearActionMessages();
  }
}
