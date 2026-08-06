import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpEventType } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProfileKPI {
  totalActions: number;
  accountStatus: string;
  adminRole: string;
  accountAgeDays: number;
  lastLoginAt?: string;
  createdAt?: string;
  activityByType: Record<string, number>;
}

export interface AdminProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  profilePhotoUrl?: string | null;
  adminRole: string;
  status: string;
  permissions: string[];
  department?: string | null;
  notes?: string | null;
  prefLanguage: string;
  prefNotifications: number;
  prefDarkMode: number;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  target: string;
  details?: string | null;
  actionType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export interface ActivityLogResponse {
  success: boolean;
  data: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfileResponse {
  success: boolean;
  admin: AdminProfile;
  kpis: ProfileKPI;
  recentActivity: ActivityLog[];
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  department?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminProfileService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // State signals
  readonly profile = signal<AdminProfile | null>(null);
  readonly kpis = signal<ProfileKPI | null>(null);
  readonly recentActivity = signal<ActivityLog[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Pagination state for activity logs
  readonly activityPage = signal(1);
  readonly activityLimit = signal(20);
  readonly activityTotal = signal(0);
  readonly activityPages = signal(1);

  /**
   * Load current admin profile with KPIs and recent activity
   */
  loadProfile() {
    this.loading.set(true);
    this.error.set(null);

    return this.http
      .get<ProfileResponse>(`${this.apiBaseUrl}/admin/profile/me`)
      .pipe(
        tap((response) => {
          if (response.success) {
            this.profile.set(response.admin);
            this.kpis.set(response.kpis);
            this.recentActivity.set(response.recentActivity);
          }
        }),
        catchError((error) => {
          console.error('Error loading profile:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors du chargement du profil'
          );
          return of({ success: false } as ProfileResponse);
        }),
        tap(() => this.loading.set(false))
      );
  }

  /**
   * Update admin profile information
   */
  updateProfile(payload: UpdateProfileRequest) {
    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .put<{ success: boolean; message: string; data: AdminProfile }>(
        `${this.apiBaseUrl}/admin/profile/me`,
        payload
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this.profile.set(response.data);
            this.successMessage.set(response.message);
            // Reload KPIs to get updated action count
            this.loadProfile().subscribe();
          }
        }),
        catchError((error) => {
          console.error('Error updating profile:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors de la mise à jour du profil'
          );
          return of({ success: false, message: '' });
        }),
        tap(() => this.saving.set(false))
      );
  }

  /**
   * Change admin password
   */
  changePassword(payload: ChangePasswordRequest) {
    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .put<{ success: boolean; message: string }>(
        `${this.apiBaseUrl}/admin/profile/me/password`,
        payload
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this.successMessage.set(response.message);
          }
        }),
        catchError((error) => {
          console.error('Error changing password:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors du changement de mot de passe'
          );
          return of({ success: false, message: '' });
        }),
        tap(() => this.saving.set(false))
      );
  }

  /**
   * Upload/update profile photo with URL
   */
  uploadPhoto(photoUrl: string) {
    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .post<{ success: boolean; message: string; data: { profilePhotoUrl: string } }>(
        `${this.apiBaseUrl}/admin/profile/me/photo`,
        { photoUrl }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data?.profilePhotoUrl) {
            this.successMessage.set(response.message);
            // Update profile photo URL in the current profile
            this.profile.update(profile => 
              profile ? { ...profile, profilePhotoUrl: response.data.profilePhotoUrl } : null
            );
          }
        }),
        catchError((error) => {
          console.error('Error uploading photo:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors du téléchargement de la photo'
          );
          return of({ success: false, message: '', data: { profilePhotoUrl: '' } });
        }),
        tap(() => this.saving.set(false))
      );
  }

  // Progress tracking for photo upload
  uploadProgress = signal(0);

  /**
   * Upload profile photo as FormData (for actual file upload)
   */
  uploadPhotoFile(file: File) {
    this.saving.set(true);
    this.uploadProgress.set(0);
    this.error.set(null);
    this.successMessage.set(null);

    const formData = new FormData();
    formData.append('photo', file, file.name);

    return this.http
      .post<{ success: boolean; message: string; data: { profilePhotoUrl: string } }>(
        `${this.apiBaseUrl}/admin/profile/me/photo`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      )
      .pipe(
        tap((event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            // Update progress
            if (event.total) {
              this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
            }
          } else if (event.type === HttpEventType.Response) {
            this.uploadProgress.set(0);
            if (event.body?.success && event.body.data?.profilePhotoUrl) {
              this.successMessage.set(event.body.message);
              // Update profile photo URL in the current profile
              this.profile.update(profile => 
                profile ? { ...profile, profilePhotoUrl: event.body.data.profilePhotoUrl } : null
              );
            }
          }
        }),
        catchError((error) => {
          console.error('Error uploading photo file:', error);
          this.uploadProgress.set(0);
          this.error.set(
            error?.error?.message ?? 'Erreur lors du téléchargement du fichier photo'
          );
          // Return a compatible observable
          return of({ type: HttpEventType.Sent } as HttpEvent<any>);
        }),
        tap(() => this.saving.set(false))
      );
  }

  /**
   * Remove profile photo
   */
  removePhoto() {
    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    return this.http
      .delete<{ success: boolean; message: string }>(
        `${this.apiBaseUrl}/admin/profile/me/photo`
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this.successMessage.set(response.message);
            // Update profile photo URL in the current profile
            this.profile.update(profile => 
              profile ? { ...profile, profilePhotoUrl: null } : null
            );
          }
        }),
        catchError((error) => {
          console.error('Error removing photo:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors de la suppression de la photo'
          );
          return of({ success: false, message: '' });
        }),
        tap(() => this.saving.set(false))
      );
  }

  /**
   * Load activity logs for current admin
   */
  loadActivityLogs(page: number = 1, limit: number = 20) {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));

    return this.http
      .get<ActivityLogResponse>(`${this.apiBaseUrl}/admin/profile/activity`, {
        params,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.recentActivity.set(response.data);
            this.activityPage.set(page);
            this.activityLimit.set(limit);
            this.activityTotal.set(response.pagination.total);
            this.activityPages.set(response.pagination.totalPages);
          }
        }),
        catchError((error) => {
          console.error('Error loading activity logs:', error);
          this.error.set(
            error?.error?.message ?? 'Erreur lors du chargement des activités'
          );
          return of({ success: false, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
        }),
        tap(() => this.loading.set(false))
      );
  }

  /**
   * Load more activity logs (next page)
   */
  loadMoreActivity() {
    const nextPage = this.activityPage() + 1;
    if (nextPage <= this.activityPages()) {
      this.loadActivityLogs(nextPage, this.activityLimit());
    }
  }

  /**
   * Refresh all profile data
   */
  refresh() {
    this.loadProfile().subscribe();
    this.loadActivityLogs().subscribe();
  }

  /**
   * Clear error message
   */
  clearError() {
    this.error.set(null);
  }

  /**
   * Clear success message
   */
  clearSuccessMessage() {
    this.successMessage.set(null);
  }

  /**
   * Get admin's full name initials for avatar display
   */
  getInitials(): string {
    const profile = this.profile();
    if (!profile?.fullName) return 'AD';

    const nameParts = profile.fullName.trim().split(/\s+/);
    if (nameParts.length === 0) return 'AD';
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      (nameParts[0].charAt(0) + (nameParts[nameParts.length - 1].charAt(0) || ''))
        .toUpperCase()
        .substring(0, 2)
    );
  }

  /**
   * Get role badge color class based on admin role
   */
  getRoleColorClass(role: string): string {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-violet-50 text-violet-700',
      FINANCE_ADMIN: 'bg-emerald-50 text-emerald-700',
      MODERATION_ADMIN: 'bg-amber-50 text-amber-700',
      SUPPORT_ADMIN: 'bg-cyan-50 text-cyan-700',
    };

    return colors[role] || 'bg-gray-100 text-gray-700';
  }

  /**
   * Get role label in French
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      FINANCE_ADMIN: 'Finance',
      MODERATION_ADMIN: 'Modération',
      SUPPORT_ADMIN: 'Support',
    };

    return labels[role] || role;
  }

  /**
   * Get action type color class for activity logs
   */
  getActionTypeColorClass(type: string): string {
    const colors: Record<string, string> = {
      FINANCE: 'text-green-600',
      MODERATION: 'text-emerald-600',
      SETTINGS: 'text-amber-600',
      AUTH: 'text-cyan-600',
      PROFILE: 'text-violet-600',
      SYSTEM: 'text-gray-600',
    };

    return colors[type] || 'text-gray-600';
  }

  /**
   * Get action type background color class for activity logs
   */
  getActionTypeBgColorClass(type: string): string {
    const colors: Record<string, string> = {
      FINANCE: 'bg-green-100',
      MODERATION: 'bg-emerald-100',
      SETTINGS: 'bg-amber-100',
      AUTH: 'bg-cyan-100',
      PROFILE: 'bg-violet-100',
      SYSTEM: 'bg-gray-100',
    };

    return colors[type] || 'bg-gray-100';
  }

  /**
   * Format account age in human-readable format
   */
  formatAccountAge(days: number): string {
    if (days < 1) return 'Aujourd\'hui';
    if (days < 30) return `Il y a ${days} jours`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `Il y a ${months} mois`;
    }

    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const months = Math.floor(remainingDays / 30);

    if (months > 0) {
      return `Il y a ${years} ans et ${months} mois`;
    }
    return `Il y a ${years} ans`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString.split('T')[0] || dateString;
    }
  }

  /**
   * Format short date for display (without time)
   */
  formatShortDate(dateString?: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString.split('T')[0] || dateString;
    }
  }
}