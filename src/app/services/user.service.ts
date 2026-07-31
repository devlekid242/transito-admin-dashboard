import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of, tap } from 'rxjs';

// User Type
export type UserRole = 'CLIENT' | 'AGENT' | 'ADMIN';
export type UserStatus = 'active' | 'suspended' | 'inactive';

// User Interface for list items
export interface User {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  status: UserStatus;
  role: UserRole;
  avatarColor: string;
  createdAt: string;
  reservationsCount: number;
  cancellationsCount: number;
  agency?: {
    id: number;
    name: string;
  } | null;
  adminRole?: string;
  adminStatus?: string;
}

// Detailed User Profile Interface
export interface UserProfile {
  user: {
    id: number;
    fullName: string;
    email: string | null;
    phoneNumber: string;
    role: UserRole;
    status: UserStatus;
    avatarColor: string;
    createdAt: string;
    lastLoginAt: string | null;
    villeResidence: string | null;
    quartier: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    agency?: {
      id: number;
      name: string;
      phone: string;
      email: string;
    } | null;
    agentRole?: string;
    agentStatus?: string;
    adminRole?: string;
    adminStatus?: string;
    adminPermissions?: string[];
  };
  stats: {
    totalReservations: number;
    completed: number;
    cancelled: number;
    noShow: number;
    totalSpent: number;
    avgTicket: number;
    favoriteRoute: string;
  };
  reservations: Reservation[];
  cancellations: Reservation[];
  transactions: Transaction[];
}

// Reservation Interface
export interface Reservation {
  id: number;
  reference: string;
  route: string;
  date: string;
  departure: string;
  agency: string;
  amount: number;
  seats: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'FAILED' | 'REFUNDED';
  paymentMethod: string | null;
  paymentStatus: string | null;
}

// Transaction Interface
export interface Transaction {
  id: number;
  type: 'PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'COMMISSION' | 'TOPUP' | 'UNKNOWN';
  label: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  description: string;
  operator?: string;
  reference?: string;
}

// User KPIs Interface
export interface UserKpis {
  totalUsers: number;
  totalClients: number;
  totalAgents: number;
  totalAdmins: number;
  activeUsers: number;
  blockedUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalReservations: number;
  cancellationRate: number;
}

// User Filters Interface
export interface UserFilters {
  role?: UserRole | 'ALL';
  status?: UserStatus | 'ALL';
  search?: string;
}

// API Response Interface
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp?: string;
}

// List Response Interface
export interface UserListResponse {
  success: boolean;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Profile Response Interface
export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
  timestamp: string;
}

// KPIs Response Interface
export interface UserKpisResponse {
  success: boolean;
  data: UserKpis;
  timestamp: string;
}

// Status Toggle Response Interface
export interface StatusToggleResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    status: UserStatus;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Signal state for reactive management
  readonly users = signal<User[]>([]);
  readonly currentUser = signal<UserProfile | null>(null);
  readonly userKpis = signal<UserKpis | null>(null);

  // Loading states
  readonly loadingUsers = signal<boolean>(false);
  readonly loadingProfile = signal<boolean>(false);
  readonly loadingKpis = signal<boolean>(false);

  // Pagination state
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly totalUsers = signal<number>(0);

  // Filter state
  readonly roleFilter = signal<UserRole | 'ALL'>('ALL');
  readonly statusFilter = signal<UserStatus | 'ALL'>('ALL');
  readonly searchQuery = signal<string>('');

  // Computed signals
  readonly filteredUsers = computed(() => {
    const users = this.users();
    const search = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return users.filter(user => {
      const matchesSearch = search === '' || 
        user.fullName.toLowerCase().includes(search) ||
        (user.email?.toLowerCase().includes(search) ?? false) ||
        user.phoneNumber.toLowerCase().includes(search) ||
        (user.agency?.name?.toLowerCase().includes(search) ?? false);

      const matchesRole = role === 'ALL' || user.role === role;
      const matchesStatus = status === 'ALL' || user.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  /**
   * Get all users with optional filtering and pagination.
   */
  getUsers(page: number = 1, limit: number = 10, filters: UserFilters = {}) {
    this.loadingUsers.set(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.role && filters.role !== 'ALL') {
      params = params.set('role', filters.role);
    }

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }

    if (filters.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<ApiResponse<User[]>>(`${this.apiBaseUrl}/admin/users`, { params })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Cast status and role to the correct types
            const users = response.data.map(u => ({
              ...u,
              status: u.status as UserStatus,
              role: u.role as UserRole
            }));
            this.users.set(users);
            this.currentPage.set(page);
            
            if (response.pagination) {
              this.totalPages.set(response.pagination.totalPages);
              this.totalUsers.set(response.pagination.total);
            }
          }
        }),
        catchError(error => {
          console.error('Error fetching users:', error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération des utilisateurs' });
        }),
        tap(() => this.loadingUsers.set(false))
      );
  }

  /**
   * Get user KPI statistics.
   */
  getUserKpis() {
    this.loadingKpis.set(true);

    return this.http.get<ApiResponse<UserKpis>>(`${this.apiBaseUrl}/admin/users/kpis`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.userKpis.set(response.data as UserKpis);
          }
        }),
        catchError(error => {
          console.error('Error fetching user KPIs:', error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération des KPIs' });
        }),
        tap(() => this.loadingKpis.set(false))
      );
  }

  /**
   * Get a single user profile by ID.
   */
  getUserProfile(id: number) {
    this.loadingProfile.set(true);

    return this.http.get<ApiResponse<UserProfile>>(`${this.apiBaseUrl}/admin/users/${id}`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentUser.set(response.data as UserProfile);
          }
        }),
        catchError(error => {
          console.error(`Error fetching user profile ${id}:`, error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération du profil utilisateur' });
        }),
        tap(() => this.loadingProfile.set(false))
      );
  }

  /**
   * Toggle user status (active <-> suspended).
   */
  toggleUserStatus(id: number) {
    return this.http.put<ApiResponse<{ id: number; status: UserStatus }>>(
      `${this.apiBaseUrl}/admin/users/${id}/toggle-status`,
      {}
    )
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            const newStatus = response.data.status;

            // Update the user in the list
            this.users.update(users =>
              users.map(user =>
                user.id === id ? { ...user, status: newStatus } : user
              )
            );

            // Update the current user if it's the one we're viewing
            if (this.currentUser()?.user.id === id) {
              this.currentUser.update(profile =>
                profile ? { ...profile, user: { ...profile.user, status: newStatus } } : null
              );
            }
          }
        }),
        catchError(error => {
          console.error(`Error toggling user status ${id}:`, error);
          return of({ success: false, message: error.error?.message || 'Erreur lors du changement de statut' });
        })
      );
  }

  /**
   * Refresh users list with current filters.
   */
  refreshUsers() {
    const page = this.currentPage();
    const limit = 10; // Default limit
    const filters: UserFilters = {};
    
    const role = this.roleFilter();
    const status = this.statusFilter();
    const search = this.searchQuery();

    if (role !== 'ALL') filters.role = role;
    if (status !== 'ALL') filters.status = status;
    if (search) filters.search = search;

    this.getUsers(page, limit, filters).subscribe();
  }

  /**
   * Set role filter.
   */
  setRoleFilter(role: UserRole | 'ALL') {
    this.roleFilter.set(role);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  /**
   * Set status filter.
   */
  setStatusFilter(status: UserStatus | 'ALL') {
    this.statusFilter.set(status);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  /**
   * Set search query.
   */
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset to first page when searching
  }

  /**
   * Format currency to FCFA.
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  }

  /**
   * Format currency without symbol (just number with spaces).
   */
  formatNumber(amount: number): string {
    return amount.toLocaleString('fr-FR');
  }

  /**
   * Get initials for user avatar.
   */
  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  /**
   * Get role label for display.
   */
  getRoleLabel(role: UserRole | 'ALL'): string {
    switch (role) {
      case 'CLIENT': return 'Client';
      case 'AGENT': return 'Agent';
      case 'ADMIN': return 'Administrateur';
      default: return 'Tous les rôles';
    }
  }

  /**
   * Get status label for display.
   */
  getStatusLabel(status: UserStatus | 'ALL'): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'suspended': return 'Bloqué';
      case 'inactive': return 'Inactif';
      default: return 'Tous les statuts';
    }
  }

  /**
   * Get status badge variant.
   */
  getStatusBadgeVariant(status: UserStatus): 'active' | 'suspended' | 'pending' {
    switch (status) {
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'inactive': return 'suspended';
      default: return 'suspended';
    }
  }

  /**
   * Get role badge variant.
   */
  getRoleBadgeVariant(role: UserRole): 'client' | 'agent' | 'admin' {
    switch (role) {
      case 'CLIENT': return 'client';
      case 'AGENT': return 'agent';
      case 'ADMIN': return 'admin';
      default: return 'client';
    }
  }

  /**
   * Get translation for transaction type.
   */
  typeLabel(type: string): string {
    const map: Record<string, string> = {
      'PAYMENT': 'Paiement',
      'WITHDRAWAL': 'Retrait',
      'REFUND': 'Remboursement',
      'COMMISSION': 'Commission',
      'TOPUP': 'Recharge'
    };
    return map[type] || type;
  }

  /**
   * Get users count by role.
   */
  getUsersByRole(role: UserRole): number {
    return this.users().filter(u => u.role === role).length;
  }

  /**
   * Get users count by status.
   */
  getUsersByStatus(status: UserStatus): number {
    return this.users().filter(u => u.status === status).length;
  }
}