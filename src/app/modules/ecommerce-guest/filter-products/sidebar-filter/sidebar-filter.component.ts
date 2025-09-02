
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar-filter',
  templateUrl: './sidebar-filter.component.html',
  styleUrls: ['./sidebar-filter.component.css']
})
export class SidebarFilterComponent {
  @Output() filterByPrice: EventEmitter<string> = new EventEmitter<string>();
  @Input() noneSidebar: boolean = true;
  @Input() categories: any[] = [];
  @Input() variedades: any[] = [];
  @Input() coloresDisponibles: any[] = [];
  @Input() filtersApplied: boolean = false;
  @Input() selectedColors: string[] = [];
  @Input() variedad_selected: any;
  @Input() is_discount: any;
  @Input() categoryTitle: string = '';
  @Input() locale: string = '';
  @Input() country: string = '';
  @Output() closeSidebar = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() selectedVariedad = new EventEmitter<any>();
  @Output() toggleColor = new EventEmitter<string>();

  onSelectVariedad(variedad: any) {
    this.selectedVariedad.emit(variedad);
  }

  onToggleColor(color: string) {
    this.toggleColor.emit(color);
  }

  onClearFilters() {
    this.clearFilters.emit();
  }

  filterProduct(event?: Event) {
    event?.preventDefault();
    const priceInput = (document.getElementById('amount') as HTMLInputElement)?.value || '';
    this.filterByPrice.emit(priceInput);
  }
}
