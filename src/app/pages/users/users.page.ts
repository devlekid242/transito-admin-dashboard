import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table.component';
import { UserService, User, UserRole, UserStatus } from '../../services/user.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { StatCardComponent } from '../../shared/stat-card.component';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    RouterLink,
    DataTableComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    StatCardComponent,
  ],
  templateUrl: 'users.page.html',
})
export class UsersPage implements OnInit {
  readonly userService = inject(UserService);

  // Get users from service
  readonly users = this.userService.users;
  readonly loading = this.userService.loadingUsers;
  readonly userKpis = this.userService.userKpis;

  // Datatable configuration
  readonly columns: DataTableColumn[] = [
    { key: 'fullName', label: 'Utilisateur', align: 'left' },
    { key: 'role', label: 'Rôle', align: 'left' },
    { key: 'agency', label: 'Agence', align: 'left' },
    { key: 'createdAt', label: 'Inscrit le', align: 'left' },
    { key: 'reservationsCount', label: 'Réservations', align: 'left' },
    { key: 'cancellationsCount', label: 'Annulations', align: 'left' },
    { key: 'status', label: 'Statut', align: 'left' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  readonly searchPlaceholder = 'Rechercher par nom, email, téléphone ou agence...';
  readonly emptyMessage = 'Aucun utilisateur trouvé.';

  // Search keys for datatable search
  readonly searchKeys = ['fullName', 'phoneNumber', 'email'];

  constructor() {}

  ngOnInit(): void {
    // Load initial data
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Load all users - Datatable will handle client-side filtering
    this.userService.getUsers(1, 100).subscribe(); // Get up to 100 users
    this.userService.getUserKpis().subscribe();
  }

  // Helper methods for display
  getInitials(name: string): string {
    return this.userService.getInitials(name);
  }

  formatNumber(n: number): string {
    return this.userService.formatNumber(n);
  }

  str(n: number): string {
    return String(n);
  }

  // Filter handlers
  onSearch(value: string): void {
    this.userService.setSearchQuery(value);
  }

  onRoleChange(value: string): void {
    this.userService.setRoleFilter(value as UserRole | 'ALL');
  }

  onStatusChange(value: string): void {
    this.userService.setStatusFilter(value as UserStatus | 'ALL');
  }

  // Get role badge classes
  getRoleBadgeClasses(role: UserRole): { bg: string; text: string } {
    switch (role) {
      case 'CLIENT':
        return { bg: 'bg-green-50', text: 'text-green-700' };
      case 'AGENT':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
      case 'ADMIN':
        return { bg: 'bg-violet-50', text: 'text-violet-700' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700' };
    }
  }

  // Get role icon
  getRoleIcon(role: UserRole): string {
    switch (role) {
      case 'CLIENT':
        return 'fa-user';
      case 'AGENT':
        return 'fa-user-tie';
      case 'ADMIN':
        return 'fa-user-cog';
      default:
        return 'fa-user';
    }
  }

  // Get role label
  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  // Toggle user block status
  toggleBlock(user: User): void {
    this.userService.toggleUserStatus(user.id).subscribe({
      next: (response) => {
        if (!response.success) {
          console.error('Error toggling user status:', response.message);
        }
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
      }
    });
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Get status badge variant
  getStatusBadgeVariant(status: UserStatus): 'active' | 'suspended' | 'pending' {
    return this.userService.getStatusBadgeVariant(status);
  }

  // Get status label
  getStatusLabel(status: UserStatus): string {
    return this.userService.getStatusLabel(status);
  }
}