import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of, tap } from 'rxjs';

// Trip Status Types
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';

// Trip Stop Interface
export interface TripStop {
  city: string;
  time: string;
  type: 'BOARDING' | 'DROPOFF';
  address: string;
}

// Passenger Manifest Interface
export interface ManifestPassenger {
  id: number;
  name: string;
  phone: string;
  cni?: string;
  seat: string | number | null;
  ticketRef: string;
  boardingPoint: string;
  paymentMethod: string;
  amount: number;
  status: 'BOARDING' | 'BOARDED' | 'NO_SHOW';
  checkedIn: boolean;
  qrCodeToken?: string;
}

// Trip Interface for list items
export interface Trip {
  id: number;
  ref: string;
  route: string;
  agency: string;
  agencyId: number;
  date: string;
  departure: string;
  arrival: string;
  busType: string;
  busPlate: string;
  driver: string;
  bookedSeats: number;
  totalSeats: number;
  fillRate: number;
  revenue: number;
  status: TripStatus;
}

// Detailed Trip Interface
export interface TripDetail extends Trip {
  departureCity: string;
  arrivalCity: string;
  duration: string;
  driverPhone: string;
  price: number;
  availableSeats: number;
  commission: number;
  bus: {
    id: number;
    licensePlate: string;
    model: string;
    capacity: number;
  } | null;
  agencyDetails: {
    id: number;
    name: string;
    phone: string;
    city: string;
  } | null;
  boardingPoints: string[];
  stops: TripStop[];
  manifest: ManifestPassenger[];
  createdAt: string;
}

// Trip KPIs Interface
export interface TripKpis {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalPassengers: number;
  totalRevenue: number;
  todayVolume: number;
}

// Trip Filters Interface
export interface TripFilters {
  startDate?: string;
  endDate?: string;
  status?: TripStatus | 'ALL';
  agencyId?: number | null;
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
export interface TripListResponse {
  success: boolean;
  data: Trip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // Signal state for reactive management
  readonly trips = signal<Trip[]>([]);
  readonly currentTrip = signal<TripDetail | null>(null);
  readonly tripKpis = signal<TripKpis | null>(null);

  // Loading states
  readonly loadingTrips = signal<boolean>(false);
  readonly loadingDetail = signal<boolean>(false);
  readonly loadingKpis = signal<boolean>(false);
  readonly loadingManifest = signal<boolean>(false);

  // Pagination state
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly totalTrips = signal<number>(0);

  // Filter state
  readonly dateRange = signal<{ start: string; end: string } | null>(null);
  readonly statusFilter = signal<TripStatus | 'ALL'>('ALL');
  readonly agencyFilter = signal<number | null>(null);
  readonly searchQuery = signal<string>('');

  // Computed signals
  readonly filteredTrips = computed(() => {
    const trips = this.trips();
    const search = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const agencyId = this.agencyFilter();

    return trips.filter(trip => {
      const matchesSearch = search === '' ||
        (trip.ref?.toLowerCase().includes(search) ?? false) ||
        (trip.route?.toLowerCase().includes(search) ?? false) ||
        (trip.agency?.toLowerCase().includes(search) ?? false) ||
        (trip.driver?.toLowerCase().includes(search) ?? false) ||
        (trip.busPlate?.toLowerCase().includes(search) ?? false);

      const matchesStatus = status === 'ALL' || trip.status === status;
      const matchesAgency = agencyId === null || trip.agencyId === agencyId;

      return matchesSearch && matchesStatus && matchesAgency;
    });
  });

  /**
   * Get all trips with optional filtering and pagination.
   */
  getTrips(
    page: number = 1,
    limit: number = 10,
    filters: TripFilters = {}
  ) {
    this.loadingTrips.set(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.startDate) {
      params = params.set('start_date', filters.startDate);
    }

    if (filters.endDate) {
      params = params.set('end_date', filters.endDate);
    }

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }

    if (filters.agencyId) {
      params = params.set('agency_id', filters.agencyId.toString());
    }

    if (filters.search) {
      params = params.set('search', filters.search);
    }

    return this.http
      .get<ApiResponse<Trip[]>>(`${this.apiBaseUrl}/admin/trips`, { params })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.trips.set(response.data);
            this.currentPage.set(page);

            if (response.pagination) {
              this.totalPages.set(response.pagination.totalPages);
              this.totalTrips.set(response.pagination.total);
            }
          }
        }),
        catchError(error => {
          console.error('Error fetching trips:', error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération des trajets' });
        }),
        tap(() => this.loadingTrips.set(false))
      );
  }

  /**
   * Get trip KPI statistics.
   */
  getTripKpis(startDate?: string, endDate?: string, agencyId?: number) {
    this.loadingKpis.set(true);

    let params = new HttpParams();
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (agencyId) {
      params = params.set('agency_id', agencyId.toString());
    }

    return this.http
      .get<ApiResponse<TripKpis>>(`${this.apiBaseUrl}/admin/trips/kpis`, { params })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.tripKpis.set(response.data);
          }
        }),
        catchError(error => {
          console.error('Error fetching trip KPIs:', error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération des KPIs' });
        }),
        tap(() => this.loadingKpis.set(false))
      );
  }

  /**
   * Get a single trip by ID with full details including manifest.
   */
  getTripDetail(id: number) {
    this.loadingDetail.set(true);

    return this.http
      .get<ApiResponse<TripDetail>>(`${this.apiBaseUrl}/admin/trips/${id}`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentTrip.set(response.data);
          }
        }),
        catchError(error => {
          console.error(`Error fetching trip detail ${id}:`, error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération du trajet' });
        }),
        tap(() => this.loadingDetail.set(false))
      );
  }

  /**
   * Get manifest for a specific trip.
   */
  getTripManifest(tripId: number) {
    this.loadingManifest.set(true);

    return this.http
      .get<ApiResponse<{data: ManifestPassenger[], counts: {total: number, boarded: number, boarding: number, noShow: number}}>>
      (`${this.apiBaseUrl}/admin/trips/${tripId}/manifest`)
      .pipe(
        tap(response => {
          // Could store manifest data if needed
        }),
        catchError(error => {
          console.error(`Error fetching manifest for trip ${tripId}:`, error);
          return of({ success: false, message: error.error?.message || 'Erreur lors de la récupération du manifeste' });
        }),
        tap(() => this.loadingManifest.set(false))
      );
  }

  /**
   * Refresh trips list with current filters.
   */
  refreshTrips() {
    const page = this.currentPage();
    const limit = 10; // Default limit
    const filters: TripFilters = {};

    const dateRange = this.dateRange();
    const status = this.statusFilter();
    const agencyId = this.agencyFilter();
    const search = this.searchQuery();

    if (dateRange) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }
    if (status !== 'ALL') filters.status = status;
    if (agencyId) filters.agencyId = agencyId;
    if (search) filters.search = search;

    this.getTrips(page, limit, filters).subscribe();
  }

  /**
   * Set date range filter.
   */
  setDateRange(range: { start: string; end: string } | null) {
    this.dateRange.set(range);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  /**
   * Set status filter.
   */
  setStatusFilter(status: TripStatus | 'ALL') {
    this.statusFilter.set(status);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  /**
   * Set agency filter.
   */
  setAgencyFilter(agencyId: number | null) {
    this.agencyFilter.set(agencyId);
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
   * Get status label for display.
   */
  getStatusLabel(status: TripStatus | string): string {
    switch (status) {
      case 'SCHEDULED': return 'Planifié';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminé';
      case 'CANCELLED': return 'Annulé';
      case 'DELAYED': return 'Retardé';
      default: return status as string;
    }
  }

  /**
   * Get status badge variant.
   */
  getStatusBadgeVariant(status: TripStatus | string): 'approved' | 'pending' | 'rejected' | 'missing' | 'verified' | 'info' {
    switch (status) {
      case 'SCHEDULED':
        return 'pending';
      case 'IN_PROGRESS':
        return 'info';
      case 'COMPLETED':
        return 'verified';
      case 'CANCELLED':
      case 'DELAYED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Get passenger status label.
   */
  getPassengerStatusLabel(status: 'BOARDING' | 'BOARDED' | 'NO_SHOW' | string): string {
    switch (status) {
      case 'BOARDED': return 'Embarqué';
      case 'BOARDING': return 'En attente';
      case 'NO_SHOW': return 'No-show';
      default: return status as string;
    }
  }

  /**
   * Get passenger status badge variant.
   */
  getPassengerStatusBadgeVariant(status: 'BOARDING' | 'BOARDED' | 'NO_SHOW' | string): 'approved' | 'pending' | 'rejected' | 'verified' | 'info' {
    switch (status) {
      case 'BOARDED': return 'verified';
      case 'BOARDING': return 'pending';
      case 'NO_SHOW': return 'rejected';
      default: return 'pending';
    }
  }

  /**
   * Format date for display.
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date and time for display.
   */
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

  /**
   * Format time only.
   */
  formatTime(timeString: string): string {
    const date = new Date(timeString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Status options for filter
  readonly statusOptions: { value: TripStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'SCHEDULED', label: 'Planifiés' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminés' },
    { value: 'CANCELLED', label: 'Annulés' },
    { value: 'DELAYED', label: 'Retardés' },
  ];
}