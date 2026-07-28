import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChartSeries {
  name: string;
  data: number[];
  color: string;
  fill: string;
  dotClass: string;
  path: string;
  areaPath: string;
  points: { x: number; y: number }[];
}

@Component({
  selector: 'app-line-chart',
  imports: [CommonModule],
  templateUrl: 'line-chart.component.html',
})
export class LineChartComponent {
  @Input({ required: true }) labels: string[] = [];
  @Input() legend = false;
  readonly width = 600;
  readonly height = 240;
  readonly padding = 20;

  readonly series = signal<ChartSeries[]>([]);

  @Input() set chartSeries(value: { name: string; data: number[]; color: string; fill?: string; dotClass?: string }[]) {
    this.series.set(
      value.map((s) => {
        const max = Math.max(...s.data, 1) * 1.1;
        const min = 0;
        const range = max - min || 1;
        const stepX = (this.width - this.padding * 2) / Math.max(s.data.length - 1, 1);
        const points = s.data.map((d, i) => ({
          x: this.padding + i * stepX,
          y: this.height - this.padding - ((d - min) / range) * (this.height - this.padding * 2),
        }));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `M ${points[0].x} ${this.height - this.padding} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${this.height - this.padding} Z`;
        return {
          name: s.name,
          data: s.data,
          color: s.color,
          fill: s.fill ?? '',
          dotClass: s.dotClass ?? 'bg-green-500',
          points,
          path,
          areaPath,
        };
      }),
    );
  }

  readonly gridLines = Array.from({ length: 5 }, (_, i) => ({
    y: this.padding + ((this.height - this.padding * 2) / 4) * i,
  }));
}
