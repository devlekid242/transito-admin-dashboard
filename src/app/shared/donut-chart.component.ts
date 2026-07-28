import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  imports: [CommonModule],
  templateUrl: 'donut-chart.component.html',
})
export class DonutChartComponent {
  @Input() size = 140;
  @Input() strokeWidth = 18;
  @Input() centerLabel = '';
  @Input() valueFormat: 'number' | 'percent' = 'number';

  readonly segments = signal<{ label: string; value: number; color: string; dashArray: string; dashOffset: number }[]>([]);

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  @Input() set data(value: DonutSegment[]) {
    const total = value.reduce((sum, s) => sum + s.value, 0) || 1;
    const circ = 2 * Math.PI * this.radius;
    let offset = 0;
    this.segments.set(
      value.map((s) => {
        const fraction = s.value / total;
        const dashLength = fraction * circ;
        const seg = {
          label: s.label,
          value: s.value,
          color: s.color,
          dashArray: `${dashLength} ${circ - dashLength}`,
          dashOffset: -offset,
        };
        offset += dashLength;
        return seg;
      }),
    );
  }

  centerValue(): string {
    const total = this.segments().reduce((sum, s) => sum + s.value, 0);
    return this.formatValue(total);
  }

  formatValue(v: number): string {
    if (this.valueFormat === 'percent') return v + '%';
    return v.toLocaleString('fr-FR');
  }
}
