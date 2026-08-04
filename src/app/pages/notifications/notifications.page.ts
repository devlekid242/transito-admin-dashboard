import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { NotificationService, AdminNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'notifications.page.html',
})
export class NotificationsPage {
  readonly notificationService = inject(NotificationService);
  readonly showSingle = signal(false);
  readonly showMulti = signal(false);
  readonly selectedTargets = signal<string[]>([]);

  readonly targetTypes = [
    { value: 'users', label: 'Tous les utilisateurs' },
    { value: 'agencies', label: 'Toutes les agences' },
    { value: 'agents', label: 'Tous les agents' },
  ];

  readonly notifications = this.notificationService.notifications;

  openSingle() { this.showSingle.set(true); }
  openMulti() { this.showMulti.set(true); this.selectedTargets.set([]); }

  toggleTarget(value: string) {
    this.selectedTargets.update(list => list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  broadcastCount() { return this.notifications().filter(n => n.type === 'broadcast').length; }
  targetedCount() { return this.notifications().filter(n => n.type === 'targeted').length; }
  readRate() {
    const total = this.notifications().length;
    const read = this.notifications().filter(n => n.isRead).length;
    return total === 0 ? 0 : Math.round((read / total) * 100);
  }
  readPct(n: AdminNotification) { return Math.round((n.isRead ? 1 : 0) * 100); }

  str(n: number) { return String(n); }

  sendSingle() {
    const form = document.querySelectorAll('form')[0];
    if (!form) return;
    const inputs = form.querySelectorAll('input');
    const title = (inputs[0] as HTMLInputElement).value;
    const msg = (form.querySelector('textarea') as HTMLTextAreaElement).value;
    if (!title || !msg) return;
    this.notificationService.create({
      title,
      content: msg,
      recipientType: 'user',
      recipientId: 1,
      category: 'INFO',
    }).subscribe({
      next: () => this.showSingle.set(false),
      error: (err) => console.error('Envoi notification échoué', err),
    });
  }

  sendMulti() {
    const form = document.querySelectorAll('form')[1];
    if (!form) return;
    const inputs = form.querySelectorAll('input[type="text"]');
    const title = (inputs[0] as HTMLInputElement).value;
    const msg = (form.querySelector('textarea') as HTMLTextAreaElement).value;
    if (!title || !msg) return;
    this.notificationService.create({
      title,
      content: msg,
      recipientType: 'agency_all',
      recipientId: null,
      category: 'INFO',
    }).subscribe({
      next: () => this.showMulti.set(false),
      error: (err) => console.error('Diffusion notification échouée', err),
    });
  }
}
