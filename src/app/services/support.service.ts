import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment.prod';

/**
 * 👈 Ce service n'a pas été fourni dans l'upload initial alors qu'il est
 * utilisé par support.page.ts ET faq-management.page.ts. Reconstruit à
 * partir de l'usage réel des deux composants (voir erreurs de build) et
 * aligné sur les réponses de AdminSupportController (désormais correctement
 * sérialisées en tableaux).
 *
 * 👈 CORRIGÉ (v2) : les méthodes getTickets/getSupportStats/getTicketDetails/
 * addResponse renvoyaient l'enveloppe brute du back (`{ data: ... }`,
 * `{ stats: ..., recent_tickets: ... }`, `{ response: ... }`) au lieu de la
 * valeur "démoulée" annoncée par leur type de retour → erreurs TS2322 au
 * build. Un `map()` extrait maintenant la bonne valeur avant le `tap()`.
 */

// ==================== TICKETS ====================

export type SupportTicketStatus = 'open' | 'answered' | 'closed' | 'pending';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SupportTicketUser {
  id: number;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
}

export interface SupportResponse {
  id: number;
  ticketId?: number;
  message: string;
  createdAt: string;
  isFromSupport: boolean;
  author?: { id: number; fullName: string } | null;
}

export interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string | null;
  closedReason?: string | null;
  slaDueAt?: string | null;
  slaBreached?: boolean;
  responseCount?: number;
  // 👈 Peut être null (ticket créé par un visiteur non authentifié) : le
  // template doit utiliser la navigation sécurisée `?.` sur ce champ.
  user: SupportTicketUser | null;
  assignedTo?: { id: number; fullName: string } | null;
  lastResponse?: { id: number; message: string; createdAt: string } | null;
  responses?: SupportResponse[];
  /** Champ calculé côté client (non stocké en base), voir attachUnread(). */
  unread?: boolean;
}

export interface SupportStats {
  open: number;
  answered: number;
  closed: number;
  pending: number;
  high_priority: number;
  critical_priority: number;
  sla_breached: number;
}

// ==================== FAQ ====================

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  orderPriority: number;
  isActive: boolean;
  createdAt?: string;
}

export interface FAQFilter {
  search?: string;
  category?: string;
  activeOnly: boolean;
}

const LAST_SEEN_STORAGE_KEY = 'admin_support_last_seen_v1';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private apiUrl = `${environment.apiUrl}/admin/support`;

  // ---- Tickets ----
  readonly tickets = signal<SupportTicket[]>([]);
  readonly currentTicket = signal<SupportTicket | null>(null);
  readonly stats = signal<SupportStats | null>(null);
  /**
   * Compteur incrémenté quand un rafraîchissement détecte de nouveaux
   * tickets/messages non lus. La page peut l'observer pour déclencher un
   * toast ou un son sans dupliquer la logique de détection.
   */
  readonly newActivity = signal(0);

  // ---- FAQ ----
  readonly faqs = signal<FAQ[]>([]);
  readonly faqCategories = signal<string[]>([]);
  readonly currentFAQFilter = signal<FAQFilter>({ activeOnly: true });
  readonly error = signal<string | null>(null);

  private lastSeen = this.loadLastSeen();
  private hasLoadedOnce = false;

  constructor(private http: HttpClient) {}

  // ==================== TICKETS ====================

  getTickets(
    params: { status?: string; priority?: string; category?: string; search?: string } = {},
  ): Observable<SupportTicket[]> {
    let url = `${this.apiUrl}/tickets`;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    if (query.toString()) url += `?${query.toString()}`;

    return this.http.get<{ data: SupportTicket[]; total: number }>(url).pipe(
      map((res) => res.data || []),
      tap((data) => {
        const previousIds = new Set(this.tickets().map((t) => t.id));
        const withUnread = data.map((t) => this.attachUnread(t));

        if (this.hasLoadedOnce) {
          const total = withUnread.filter((t) => t.unread).filter(
            (t) => !previousIds.has(t.id) || !this.tickets().find((old) => old.id === t.id)?.unread,
          ).length;
          if (total > 0) {
            this.newActivity.update((n) => n + total);
            this.notifyBrowser(total);
          }
        }

        this.hasLoadedOnce = true;
        this.tickets.set(withUnread);
      }),
      catchError((err) => {
        console.error('Erreur chargement tickets admin:', err);
        this.error.set("Impossible de charger les tickets.");
        return of([]);
      }),
    );
  }

  getSupportStats(): Observable<SupportStats | null> {
    return this.http
      .get<{ stats: SupportStats; recent_tickets: SupportTicket[] }>(`${this.apiUrl}/tickets/stats`)
      .pipe(
        map((res) => res.stats),
        tap((stats) => this.stats.set(stats)),
        catchError((err) => {
          console.error('Erreur stats support:', err);
          return of(null);
        }),
      );
  }

  getTicketDetails(id: number): Observable<SupportTicket | null> {
    return this.http.get<{ data: SupportTicket }>(`${this.apiUrl}/tickets/${id}`).pipe(
      map((res) => res.data),
      tap((ticket) => this.currentTicket.set(this.attachUnread(ticket))),
      catchError((err) => {
        console.error('Erreur détail ticket:', err);
        return of(null);
      }),
    );
  }

  addResponse(id: number, message: string): Observable<SupportResponse | null> {
    return this.http
      .post<{ response: SupportResponse }>(`${this.apiUrl}/tickets/${id}/responses`, { message })
      .pipe(
        map((res) => res.response),
        tap((response) => {
          this.markAsRead(id);
          const current = this.currentTicket();
          if (current && current.id === id) {
            this.currentTicket.set({
              ...current,
              status: 'answered',
              responses: [...(current.responses || []), response],
            });
          }
        }),
        catchError((err) => {
          console.error('Erreur envoi réponse:', err);
          return of(null);
        }),
      );
  }

  updateTicketStatus(id: number, status: SupportTicketStatus, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${id}/status`, { status, reason });
  }

  updateTicketPriority(id: number, priority: SupportTicketPriority): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${id}/priority`, { priority });
  }

  assignTicket(id: number, userId: number | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${id}/assign`, { userId });
  }

  markAsRead(id: number): void {
    this.lastSeen[id] = new Date().toISOString();
    this.persistLastSeen();
    this.tickets.update((list) => list.map((t) => (t.id === id ? { ...t, unread: false } : t)));
    const current = this.currentTicket();
    if (current && current.id === id) {
      this.currentTicket.set({ ...current, unread: false });
    }
  }

  private attachUnread(t: SupportTicket): SupportTicket {
    const seenAt = this.lastSeen[t.id];
    const reference = t.updatedAt || t.createdAt;
    const unread = !seenAt || (!!reference && new Date(reference).getTime() > new Date(seenAt).getTime());
    return { ...t, unread };
  }

  private loadLastSeen(): Record<number, string> {
    try {
      const raw = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persistLastSeen(): void {
    try {
      localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(this.lastSeen));
    } catch {
      // Stockage indisponible (navigation privée, quota) : on continue sans persister.
    }
  }

  private notifyBrowser(count: number): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification('Support Tansico', {
        body: count === 1 ? 'Nouveau message reçu.' : `${count} nouveaux messages reçus.`,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  // ==================== FAQ ====================

  getFAQs(): Observable<FAQ[]> {
    const f = this.currentFAQFilter();
    const query = new URLSearchParams();
    if (f.search) query.set('search', f.search);
    if (f.category) query.set('category', f.category);
    query.set('active_only', String(f.activeOnly));

    return this.http
      .get<{ data: FAQ[]; total: number }>(`${this.apiUrl}/faqs?${query.toString()}`)
      .pipe(
        map((res) => res.data || []),
        tap((data) => this.faqs.set(data)),
        catchError((err) => {
          console.error('Erreur chargement FAQ:', err);
          this.error.set('Impossible de charger les FAQ.');
          return of([]);
        }),
      );
  }

  getFAQCategories(): Observable<{ categories: string[] }> {
    return this.http.get<{ categories: string[] }>(`${this.apiUrl}/faqs/categories`).pipe(
      tap((res) => this.faqCategories.set(res.categories || [])),
      catchError((err) => {
        console.error('Erreur catégories FAQ:', err);
        return of({ categories: [] });
      }),
    );
  }

  updateFAQFilter(partial: Partial<FAQFilter>): void {
    this.currentFAQFilter.update((f) => ({ ...f, ...partial }));
    this.getFAQs().subscribe();
  }

  resetFAQFilters(): void {
    this.currentFAQFilter.set({ activeOnly: true });
    this.getFAQs().subscribe();
  }

  createFAQ(faq: Partial<FAQ>): Observable<FAQ | null> {
    return this.http.post<{ message: string; faq: FAQ }>(`${this.apiUrl}/faqs`, faq).pipe(
      map((res) => res.faq),
      tap((created) => this.faqs.update((list) => [...list, created])),
      catchError((err) => {
        console.error('Erreur création FAQ:', err);
        this.error.set("Impossible de créer la FAQ.");
        return of(null);
      }),
    );
  }

  updateFAQ(id: number, updates: Partial<FAQ>): Observable<FAQ | null> {
    return this.http.put<{ message: string; faq: FAQ }>(`${this.apiUrl}/faqs/${id}`, updates).pipe(
      map((res) => res.faq),
      tap((updated) => this.faqs.update((list) => list.map((f) => (f.id === id ? updated : f)))),
      catchError((err) => {
        console.error('Erreur mise à jour FAQ:', err);
        this.error.set("Impossible de mettre à jour la FAQ.");
        return of(null);
      }),
    );
  }

  deleteFAQ(id: number): Observable<boolean> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/faqs/${id}`).pipe(
      map(() => true),
      tap(() => this.faqs.update((list) => list.filter((f) => f.id !== id))),
      catchError((err) => {
        console.error('Erreur suppression FAQ:', err);
        this.error.set('Impossible de supprimer la FAQ.');
        return of(false);
      }),
    );
  }

  clearError(): void {
    this.error.set(null);
  }
}