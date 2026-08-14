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

interface ChartSeriesInput {
  name: string;
  data: number[];
  color: string;
  fill?: string;
  dotClass?: string; // conservé pour compat d'API avec l'ancienne légende, non requis par Chart.js
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'line-chart.component.html',
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) labels: string[] = [];
  @Input() legend = false;
  @Input() chartSeries: ChartSeriesInput[] = [];

  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'line'>;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.canvasRef) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: this.chartSeries.map((s) => ({
          label: s.name,
          data: s.data,
          borderColor: s.color,
          backgroundColor: s.fill ?? 'transparent',
          fill: !!s.fill,
          tension: 0.35,
          pointRadius: 3.5,
          pointBackgroundColor: s.color,
          borderWidth: 2.5,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false }, // légende custom gérée dans le template
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 }, color: '#9ca3af' },
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