import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-moderation-stats',
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, DonutChartComponent, LineChartComponent],
  templateUrl: 'moderation-stats.page.html',
})
export class ModerationStatsPage {
  readonly data = inject(MockDataService);

  get ms() { return this.data.moderationStats; }
  str(n: number) { return String(n); }
}
