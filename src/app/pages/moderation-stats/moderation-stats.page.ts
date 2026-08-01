import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModerationStatsService, AgencyComparison } from '../../services/moderation-stats.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-moderation-stats',
  imports: [
    CommonModule, 
    FormsModule,
    PageHeaderComponent, 
    StatCardComponent, 
    DonutChartComponent, 
    LineChartComponent,
    StatusBadgeComponent
  ],
  templateUrl: 'moderation-stats.page.html',
})
export class ModerationStatsPage implements OnInit {
  readonly data = inject(ModerationStatsService);

  // Computed properties for template access
  get ms() { return this.data.moderationStats(); }
  get userStats() { return this.data.userStats(); }
  get agencyStats() { return this.data.agencyStats(); }
  get reservationStats() { return this.data.reservationStats(); }
  get financeStats() { return this.data.financeStats(); }
  get agencies() { return this.data.agencies(); }
  get datePresets() { return this.data.datePresets(); }
  get chartData() { return this.data.chartData(); }
  get comparisonData() { return this.data.comparisonData(); }
  get agencyComparison() { return this.data.agencyComparison(); }

  get loading() { return this.data.loadingStats(); }
  get loadingPresets() { return this.data.loadingPresets(); }
  get loadingAgencies() { return this.data.loadingAgencies(); }
  get loadingCharts() { return this.data.loadingCharts(); }

  get selectedDatePreset() { return this.data.datePreset(); }
  get selectedAgencyIds() { return this.data.selectedAgencyIds(); }
  get selectedPeriod() { return this.data.period(); }

  constructor() {
    // Effect to reload data when filters change - using untracked to prevent infinite loops
    effect(() => {
      const preset = this.data.datePreset();
      const agencyIds = this.data.selectedAgencyIds();
      const period = this.data.period();
      
      // Only reload when filters are actually changed (not during initial load)
      // Using a small timeout to prevent rapid successive calls
      const timer = setTimeout(() => {
        this.loadData();
      }, 100);
      
      // Cleanup timeout on effect cleanup
      return () => clearTimeout(timer);
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadData() {
    // Only load if we have presets loaded (to avoid initial double load)
    if (this.data.datePresets().length > 0) {
      this.data.loadStats().subscribe();
      this.data.loadAllCharts().subscribe();
      this.data.loadComparison().subscribe();
    }
  }

  loadInitialData() {
    // Load all necessary data (initial load).
    // On déclenche loadData() dans le callback de loadDatePresets() une fois
    // la réponse arrivée (et non juste après l'appel .subscribe()), car
    // l'effect() ci-dessus ne surveille pas le signal datePresets() : sans ce
    // callback, rien ne rechargeait les stats/graphiques tant qu'aucun filtre
    // n'était modifié par l'utilisateur.
    this.data.loadDatePresets().subscribe(() => this.loadData());
    this.data.loadAgencies().subscribe();
  }

  // Formatter functions for template
  str(n: number | undefined): string {
    return n !== undefined ? String(n) : '0';
  }

  fcfa(amount: number | undefined): string {
    return amount !== undefined ? this.data.formatCurrency(amount) : '0 FCFA';
  }

  percent(value: number | undefined, decimals: number = 2): string {
    return value !== undefined ? this.data.formatPercentage(value, decimals) : '0%';
  }

  // Filter change handlers
  onDatePresetChange(presetId: string) {
    this.data.setDatePreset(presetId);
  }

  onAgencySelect(agencyId: number) {
    const currentIds = this.data.selectedAgencyIds();
    if (currentIds.includes(agencyId)) {
      // Remove from selection
      this.data.setSelectedAgencyIds(currentIds.filter(id => id !== agencyId));
    } else {
      // Add to selection
      this.data.setSelectedAgencyIds([...currentIds, agencyId]);
    }
  }

  isAgencySelected(agencyId: number): boolean {
    return this.data.selectedAgencyIds().includes(agencyId);
  }

  onSelectAllAgencies() {
    const allAgencyIds = this.agencies.map(a => a.id);
    this.data.setSelectedAgencyIds(allAgencyIds);
  }

  onClearAgencySelection() {
    this.data.setSelectedAgencyIds([]);
  }

  onPeriodChange(period: string) {
    this.data.setPeriod(period);
  }

  onRefresh() {
    this.loadInitialData();
  }

  onResetFilters() {
    this.data.resetFilters();
  }

  // Helper functions for agency comparison table
  getAgencyComparisonList() {
    return this.agencyComparison;
  }

  getAgencyPerformance(agencyId: number) {
    const comparison = this.agencyComparison;
    return comparison.find((a: AgencyComparison) => a.agencyId === agencyId);
  }

  // Status display helpers
  getStatusLabel(status: string): string {
    return this.data.getStatusLabel(status);
  }

  getKycStatusLabel(status: string): string {
    return this.data.getKycStatusLabel(status);
  }

  getStatusBadgeVariant(status: string): 'approved' | 'pending' | 'rejected' | 'missing' {
    return this.data.getStatusBadgeVariant(status);
  }

  getAgencyStatusBadgeVariant(status: string): 'approved' | 'pending' | 'rejected' {
    return this.data.getAgencyStatusBadgeVariant(status);
  }

  // Chart data accessors
  getUserChartData() {
    return this.chartData?.['users'] ?? { labels: [], series: [] };
  }

  getReservationChartData() {
    return this.chartData?.['reservations'] ?? { labels: [], series: [] };
  }

  getRevenueChartData() {
    return this.chartData?.['revenue'] ?? { labels: [], series: [] };
  }

  getReservationsByStatus() {
    return this.reservationStats?.reservationsByStatus ?? [];
  }

  getUsersByType() {
    return this.userStats?.usersByType ?? [];
  }

  // Comparison data accessors
  getTopByReservations() {
    return this.comparisonData?.topByReservations ?? [];
  }

  getTopByRevenue() {
    return this.comparisonData?.topByRevenue ?? [];
  }

  getTopByFillRate() {
    return this.comparisonData?.topByFillRate ?? [];
  }

  getTopByLowestCancellation() {
    return this.comparisonData?.topByLowestCancellation ?? [];
  }
}