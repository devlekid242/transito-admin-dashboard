import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  imports: [CommonModule],
  templateUrl: 'stat-card.component.html',
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input({ required: true }) icon = '';
  @Input() iconBg = 'bg-green-600';
  @Input() trend = '';
  @Input() trendUp = true;
  @Input() accentBar = '';

  readonly trendDir = computed(() => (this.trendUp ? 'up' : 'down'));
}
