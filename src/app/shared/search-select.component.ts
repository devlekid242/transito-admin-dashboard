import { Component, Input, Output, EventEmitter, signal, computed, viewChild, ElementRef } from '@angular/core';
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
export class SearchSelectComponent {
  @Input({ required: true }) items: SearchSelectItem[] = [];
  @Input() placeholder = 'Rechercher...';
  @Input() noResultsText = 'Aucun résultat';
  @Input() disabled = false;
  @Output() selected = new EventEmitter<SearchSelectItem | null>();

  readonly open = signal(false);
  readonly query = signal('');
  readonly selectedItem = signal<SearchSelectItem | null>(null);
  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items;
    return this.items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel?.toLowerCase().includes(q) ?? false)
    );
  });

  toggle() {
    if (this.disabled) return;
    this.open.update(v => !v);
    if (this.open()) {
      setTimeout(() => this.inputRef()?.nativeElement.focus(), 50);
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
}
