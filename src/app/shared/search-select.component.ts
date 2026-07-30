import { Component, Input, Output, EventEmitter, signal, computed, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SearchSelectItem {
  id: string;
  label: string;
  sublabel?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-search-select',
  imports: [CommonModule],
  templateUrl: 'search-select.component.html',
})
export class SearchSelectComponent implements OnDestroy {
  @Input({ required: true }) items: SearchSelectItem[] = [];
  @Input() placeholder = 'Rechercher...';
  @Input() noResultsText = 'Aucun résultat';
  @Input() disabled = false;

  /**
   * When true, `items` is assumed to already be the (server-filtered) result
   * set for the current `query`. The component stops filtering locally and
   * instead emits `search` (debounced) so the parent can hit an API/service.
   * Use together with `loading` to show a spinner while the parent fetches.
   */
  @Input() async = false;

  /** Debounce delay (ms) for the `search` output when `async` is true. */
  @Input() debounceMs = 300;

  /** Shows a loading state in the dropdown while the parent fetches results. */
  @Input() loading = false;

  /**
   * Pre-selects an item (e.g. when editing an existing record, or when the
   * parent wants to reflect a selection made elsewhere).
   */
  @Input() set value(item: SearchSelectItem | null | undefined) {
    this.selectedItem.set(item ?? null);
  }

  @Output() selected = new EventEmitter<SearchSelectItem | null>();
  /** Emits the (debounced) search text whenever `async` is true and the user types. */
  @Output() search = new EventEmitter<string>();

  readonly open = signal(false);
  readonly query = signal('');
  readonly selectedItem = signal<SearchSelectItem | null>(null);
  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  private debounceTimer?: ReturnType<typeof setTimeout>;

  readonly filtered = computed(() => {
    if (this.async) return this.items;
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items;
    return this.items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel?.toLowerCase().includes(q) ?? false)
    );
  });

  onQueryChange(value: string) {
    this.query.set(value);
    if (!this.async) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.search.emit(value.trim());
    }, this.debounceMs);
  }

  toggle() {
    if (this.disabled) return;
    this.open.update(v => !v);
    if (this.open()) {
      setTimeout(() => this.inputRef()?.nativeElement.focus(), 50);
      // Kick off an initial (empty-query) fetch so the dropdown isn't empty
      // the first time it's opened in async mode.
      if (this.async) this.search.emit(this.query().trim());
    }
  }

  close() {
    this.open.set(false);
    this.query.set('');
  }

  selectItem(item: SearchSelectItem) {
    this.selectedItem.set(item);
    this.selected.emit(item);
    this.close();
  }

  clear() {
    this.selectedItem.set(null);
    this.selected.emit(null);
    this.close();
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}