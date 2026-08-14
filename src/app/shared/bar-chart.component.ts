import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'bar-chart.component.html',
})
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() valueFormat: 'number' | 'currency' = 'number';
  @Input() data: BarDatum[] = [];

  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'bar'>;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.canvasRef) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  formatValue(v: number): string {
    if (this.valueFormat === 'currency') {
      if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
      if (v >= 1_000) return Math.round(v / 1_000) + 'k';
      return String(v);
    }
    return String(v);
  }

  private renderChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.data.map((d) => d.label),
        datasets: [
          {
            data: this.data.map((d) => d.value),
            backgroundColor: this.data.map((d) => d.color),
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => this.formatValue(item.parsed.y as number),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (value) => this.formatValue(value as number),
              font: { size: 11 },
              color: '#9ca3af',
            },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#9ca3af' },
          },
        },
      },
    };

    if (this.chart) {
      this.chart.data = config.data;
      this.chart.options = config.options!;
      this.chart.update();
    } else {
      this.chart = new Chart(ctx, config);
    }
  }
}