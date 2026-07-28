import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService, SupportConversation, ChatMessage } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-support',
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: 'support.page.html',
})
export class SupportPage {
  readonly data = inject(MockDataService);
  readonly selectedId = signal<string | null>(null);
  readonly search = signal('');
  readonly activeFilter = signal<'ALL' | 'OPEN' | 'ANSWERED' | 'CLOSED'>('ALL');

  readonly filters = [
    { value: 'ALL' as const, label: 'Tous' },
    { value: 'OPEN' as const, label: 'Ouverts' },
    { value: 'ANSWERED' as const, label: 'Répondus' },
    { value: 'CLOSED' as const, label: 'Fermés' },
  ];

  constructor() {
    const first = this.data.conversations()[0];
    if (first) this.selectedId.set(first.id);
  }

  selectedConversation(): SupportConversation | null {
    return this.data.conversations().find(c => c.id === this.selectedId()) || null;
  }

  filteredConversations() {
    const s = this.search().toLowerCase().trim();
    const f = this.activeFilter();
    return this.data.conversations().filter(c => {
      const matchFilter = f === 'ALL' || c.status === f;
      const matchSearch = !s || c.user.toLowerCase().includes(s) || c.subject.toLowerCase().includes(s) || c.lastMessage.toLowerCase().includes(s);
      return matchFilter && matchSearch;
    });
  }

  countForFilter(f: string) {
    if (f === 'ALL') return this.data.conversations().length;
    return this.data.conversations().filter(c => c.status === f).length;
  }

  unreadCount() { return this.data.conversations().reduce((s, c) => s + c.unread, 0); }

  selectConversation(id: string) {
    this.selectedId.set(id);
    this.data.conversations.update(list => list.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }

  sendReply(text: string) {
    if (!text.trim() || !this.selectedId()) return;
    const id = this.selectedId()!;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = { id: 'M' + Date.now(), sender: 'admin', text: text.trim(), time: now };
    this.data.conversations.update(list => list.map(c => c.id === id ? { ...c, messages: [...c.messages, newMsg], lastMessage: text.trim(), lastTime: now, status: 'ANSWERED' } : c));
  }

  initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
}
