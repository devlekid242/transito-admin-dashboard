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
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';

Chart.register(...registerables);

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'donut-chart.component.html',
})
export class DonutChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() size = 140;
  @Input() strokeWidth = 18;
  @Input() centerLabel = '';
  @Input() valueFormat: 'number' | 'percent' = 'number';
  @Input() data: DonutSegment[] = [];

  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'doughnut'>;

  // Plugin custom pour dessiner la valeur totale + le label au centre du donut,
  // Chart.js ne le fait pas nativement.
  private readonly centerTextPlugin: Plugin<'doughnut'> = {
    id: 'centerText',
    afterDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 20px sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(this.formatValue(this.total), centerX, centerY - (this.centerLabel ? 10 : 0));
      if (this.centerLabel) {
        ctx.font = '500 10px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(this.centerLabel, centerX, centerY + 10);
      }
      ctx.restore();
    },
  };

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  get total(): number {
    return this.data.reduce((sum, s) => sum + s.value, 0);
  }

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

  formatValue(v: number): string {
    if (this.valueFormat === 'percent') return v + '%';
    return v.toLocaleString('fr-FR');
  }

  private renderChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // cutout en % calculé à partir du strokeWidth d'origine, pour garder
    // la même épaisseur d'anneau que la version SVG.
    const cutoutPct = Math.max(0, Math.min(90, 100 - (this.strokeWidth / (this.size / 2)) * 50));

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.data.map((d) => d.label),
        datasets: [
          {
            data: this.data.map((d) => d.value),
            backgroundColor: this.data.map((d) => d.color),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: `${cutoutPct}%`,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false }, // légende custom gérée dans le template
          tooltip: {
            callbacks: {
              label: (item) => `${item.label}: ${this.formatValue(item.parsed as number)}`,
            },
          },
        },
      },
      plugins: [this.centerTextPlugin],
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