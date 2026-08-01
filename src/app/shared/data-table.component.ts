import { Component, Output, EventEmitter, signal, computed, input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

@Component({
  selector: 'app-data-table',
  imports: [CommonModule],
  templateUrl: 'data-table.component.html',
})
export class DataTableComponent<T> {
  // Signal inputs: unlike plain @Input(), these are readable as signals, so
  // `computed()` blocks that read them correctly re-run whenever the parent
  // passes a new value (e.g. `[rows]="filtered()"` after an async HTTP load).
  readonly columns = input.required<DataTableColumn[]>();
  readonly rows = input.required<any[]>();
  readonly trackKey = input('id');
  readonly pageSize = input(8);
  readonly searchPlaceholder = input('Rechercher...');
  readonly searchKeys = input<string[]>([]);
  readonly emptyMessage = input('Aucune donnée trouvée.');
  readonly loading = input(false);


  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<any>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<any>;

  readonly search = signal('');
  readonly currentPage = signal(1);

  readonly filteredRows = computed(() => {
    const s = this.search().toLowerCase().trim();
    const rows = this.rows();
    const keys = this.searchKeys();
    if (!s || keys.length === 0) return rows;
    return rows.filter(row =>
      keys.some(key => {
        const val = (row as any)[key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(s);
      })
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  readonly paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  onSearch(value: string) {
    this.search.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number | '...') {
    if (page === '...') return;
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  alignClass(col: DataTableColumn) {
    if (col.align === 'right') return 'text-right';
    if (col.align === 'center') return 'text-center';
    return 'text-left';
  }

  rangeStart() { return (this.currentPage() - 1) * this.pageSize() + 1; }
  rangeEnd() { return Math.min(this.currentPage() * this.pageSize(), this.filteredRows().length); }
}