import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService, Notification } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: 'notifications.page.html',
})
export class NotificationsPage {
  readonly data = inject(MockDataService);
  readonly showSingle = signal(false);
  readonly showMulti = signal(false);
  readonly selectedTargets = signal<string[]>([]);

  readonly targetTypes = [
    { value: 'users', label: 'Tous les utilisateurs' },
    { value: 'agencies', label: 'Toutes les agences' },
    { value: 'agents', label: 'Tous les agents' },
  ];

  openSingle() { this.showSingle.set(true); }
  openMulti() { this.showMulti.set(true); this.selectedTargets.set([]); }

  toggleTarget(value: string) {
    this.selectedTargets.update(list => list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  broadcastCount() { return this.data.notifications().filter(n => n.type === 'broadcast').length; }
  targetedCount() { return this.data.notifications().filter(n => n.type === 'targeted').length; }
  readRate() {
    const total = this.data.notifications().reduce((s, n) => s + n.recipients, 0);
    const read = this.data.notifications().reduce((s, n) => s + n.readCount, 0);
    return total === 0 ? 0 : Math.round((read / total) * 100);
  }
  readPct(n: { readCount: number; recipients: number }) { return Math.round((n.readCount / n.recipients) * 100); }

  str(n: number) { return String(n); }

  sendSingle() {
    const form = document.querySelectorAll('form')[0];
    if (!form) return;
    const inputs = form.querySelectorAll('input');
    const target = (inputs[0] as HTMLInputElement).value;
    const title = (inputs[1] as HTMLInputElement).value;
    const msg = (form.querySelector('textarea') as HTMLTextAreaElement).value;
    if (!target || !title || !msg) return;
    this.addNotif(title, msg, 'targeted', target, 1);
    this.showSingle.set(false);
  }

  sendMulti() {
    const form = document.querySelectorAll('form')[1];
    if (!form) return;
    const inputs = form.querySelectorAll('input[type="text"]');
    const title = (inputs[0] as HTMLInputElement).value;
    const msg = (form.querySelector('textarea') as HTMLTextAreaElement).value;
    if (!title || !msg) return;
    const targets = this.selectedTargets();
    const label = targets.length === 0 ? 'Tous' : targets.map(t => this.targetTypes.find(tt => tt.value === t)?.label || t).join(', ');
    const recipients = targets.includes('users') ? 12480 : targets.includes('agencies') ? 5 : targets.includes('agents') ? 47 : 12485;
    this.addNotif(title, msg, 'broadcast', label, recipients);
    this.showMulti.set(false);
  }

  private addNotif(title: string, msg: string, type: 'broadcast' | 'targeted', target: string, recipients: number) {
    const newNotif: Notification = {
      id: 'N-' + String(this.data.notifications().length + 1).padStart(2, '0'),
      title, message: msg, type, target,
      sentAt: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      recipients, readCount: 0,
    };
    this.data.notifications.update(list => [newNotif, ...list]);
  }
}
