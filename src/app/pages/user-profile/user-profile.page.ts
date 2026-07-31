import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService, UserProfile } from '../../services/user.service';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterLink, StatCardComponent, StatusBadgeComponent, DataTableComponent],
  templateUrl: 'user-profile.page.html',
})
export class UserProfilePage implements OnInit {
  readonly userService = inject(UserService);
  private route = inject(ActivatedRoute);
  readonly userId = Number(this.route.snapshot.paramMap.get('id')) || 0;

  // User profile data
  readonly profile = this.userService.currentUser;
  readonly loading = this.userService.loadingProfile;

  // Tab management
  readonly activeTab = signal<'info' | 'reservations' | 'cancellations' | 'transactions'>('info');

  // Datatable configurations
  readonly reservationColumns: DataTableColumn[] = [
    { key: 'reference', label: 'Référence', align: 'left' },
    { key: 'route', label: 'Trajet', align: 'left' },
    { key: 'date', label: 'Date', align: 'left' },
    { key: 'departure', label: 'Départ', align: 'left' },
    { key: 'agency', label: 'Agence', align: 'left' },
    { key: 'amount', label: 'Montant', align: 'right' },
    { key: 'status', label: 'Statut', align: 'left' },
  ];

  readonly transactionColumns: DataTableColumn[] = [
    { key: 'id', label: 'ID', align: 'left' },
    { key: 'type', label: 'Type', align: 'left' },
    { key: 'label', label: 'Description', align: 'left' },
    { key: 'amount', label: 'Montant', align: 'right' },
    { key: 'date', label: 'Date', align: 'left' },
    { key: 'status', label: 'Statut', align: 'left' },
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    if (this.userId > 0) {
      this.userService.getUserProfile(this.userId).subscribe();
    }
  }

  fcfa(n: number) { return this.userService.formatCurrency(n); }
  str(n: number) { return String(n); }
  initials(name: string) { return this.userService.getInitials(name); }

  typeLabel(type: string): string {
    return this.userService.typeLabel(type);
  }

  toggleBlock() {
    this.userService.toggleUserStatus(this.userId).subscribe();
  }

  setActiveTab(tab: 'info' | 'reservations' | 'cancellations' | 'transactions') {
    this.activeTab.set(tab);
  }

  getStatusBadgeVariant(status: string) {
    return this.userService.getStatusBadgeVariant(status as any);
  }

  getStatusLabel(status: string) {
    return this.userService.getStatusLabel(status as any);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}