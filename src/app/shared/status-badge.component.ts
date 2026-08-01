import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'verified' | 'missing' | 'info' | 'active' | 'suspended' | 'open' | 'answered' | 'closed' | 'low' | 'medium' | 'high' | 'completed';

@Component({
  selector: 'app-status-badge',
  imports: [CommonModule],
  templateUrl: 'status-badge.component.html',
})
export class StatusBadgeComponent {
  @Input({ required: true }) variant: BadgeVariant = 'pending';
  @Input({ required: true }) label = '';
  @Input() icon = '';
  @Input() size: 'sm' | 'xs' | 'lg' = 'sm';

  private readonly variantMap: Record<BadgeVariant, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    verified: 'bg-green-100 text-green-700',
    missing: 'bg-orange-100 text-orange-700',
    info: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    open: 'bg-green-100 text-green-800',
    answered: 'bg-amber-100 text-amber-800',
    closed: 'bg-gray-100 text-gray-600',
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  classes() {
    return this.variantMap[this.variant];
  }
}
