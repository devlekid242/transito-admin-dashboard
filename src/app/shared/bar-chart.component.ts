import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-bar-chart',
  imports: [CommonModule],
  templateUrl: 'bar-chart.component.html',
})
export class BarChartComponent {
  @Input() valueFormat: 'number' | 'currency' = 'number';
  readonly bars = signal<{ label: string; value: number; color: string; pct: number }[]>([]);

  @Input() set data(value: BarDatum[]) {
    const max = Math.max(...value.map((v) => v.value), 1);
    this.bars.set(value.map((v) => ({ ...v, pct: Math.round((v.value / max) * 100) })));
  }

  formatValue(v: number): string {
    if (this.valueFormat === 'currency') {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
      if (v >= 1000) return Math.round(v / 1000) + 'k';
      return String(v);
    }
    return String(v);
  }
}
