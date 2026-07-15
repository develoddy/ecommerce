
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-sidebar-filter',
  templateUrl: './sidebar-filter.component.html',
  styleUrls: ['./sidebar-filter.component.css']
})
export class SidebarFilterComponent implements OnInit, OnDestroy {
  @Output() filterByPrice: EventEmitter<string> = new EventEmitter<string>();
  @Output() searchProducts: EventEmitter<string> = new EventEmitter<string>();
  @Output() categoryFilter: EventEmitter<number[]> = new EventEmitter<number[]>();
  @Output() discountFilter: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() newFilter: EventEmitter<boolean> = new EventEmitter<boolean>();
  
  @Input() noneSidebar: boolean = true;
  @Input() categories: any[] = [];
  @Input() variedades: any[] = [];
  @Input() coloresDisponibles: any[] = [];
  @Input() filtersApplied: boolean = false;
  @Input() selectedColors: string[] = [];
  @Input() variedad_selected: any = {id: null};
  @Input() is_discount: any;
  @Input() categoryTitle: string = '';
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() products: any[] = [];
  
  @Output() closeSidebar = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() selectedVariedad = new EventEmitter<any>();
  @Output() toggleColor = new EventEmitter<string>();

  // New properties for enhanced functionality
  searchQuery: string = '';
  selectedCategories: number[] = [];
  showOnlyDiscounted: boolean = false;
  showOnlyNew: boolean = false;
  priceRange = { min: 15, max: 100 };
  
  // UI State
  expandedSections: { [key: string]: boolean } = {
    search: true,
    categories: true,
    sizes: false,
    colors: false,
    price: false,
    offers: false
  };

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchProducts.emit(query);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Computed properties
  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.selectedCategories.length > 0) count++;
    if (this.selectedColors.length > 0) count++;
    if (this.variedad_selected && this.variedad_selected.id) count++;
    if (this.showOnlyDiscounted) count++;
    if (this.showOnlyNew) count++;
    if (this.priceRange.min !== 15 || this.priceRange.max !== 100) count++;
    return count;
  }

  get filteredProductsCount(): number {
    return this.products ? this.products.length : 0;
  }

  // Section management
  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  // Search functionality
  onSearchChange(event: any) {
    const query = event.target.value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  // Category filtering
  onCategoryChange(categoryId: number) {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(categoryId);
    }
    this.categoryFilter.emit(this.selectedCategories);
  }

  // Clear filters when switching between filter types
  clearOtherFilters(keepType: string) {
    if (keepType !== 'categories') this.selectedCategories = [];
    if (keepType !== 'search') this.searchQuery = '';
    if (keepType !== 'discount') this.showOnlyDiscounted = false;
    if (keepType !== 'new') this.showOnlyNew = false;
    if (keepType !== 'price') this.priceRange = { min: 15, max: 100 };
  }

  getCategoryProductCount(categoryId: number): number {
    if (!this.products) return 0;
    return this.products.filter(product => 
      product.categorie && product.categorie._id === categoryId
    ).length;
  }

  // Size/Variety selection
  onSelectVariedad(variedad: any) {
    this.selectedVariedad.emit(variedad);
  }

  // Color selection
  onToggleColor(color: string) {
    this.toggleColor.emit(color);
  }

  // Price filtering
  onPriceChange() {
    // Real-time validation
    if (this.priceRange.min > this.priceRange.max) {
      this.priceRange.max = this.priceRange.min;
    }
  }

  applyPriceFilter() {
    this.clearOtherFilters('price');
    const priceString = `$${this.priceRange.min} - $${this.priceRange.max}`;
    this.filterByPrice.emit(priceString);
  }

  // Discount/New filters
  onDiscountFilterChange(event: any) {
    this.clearOtherFilters('discount');
    this.showOnlyDiscounted = event.target.checked;
    this.discountFilter.emit(this.showOnlyDiscounted);
  }

  onNewFilterChange(event: any) {
    this.showOnlyNew = event.target.checked;
    this.newFilter.emit(this.showOnlyNew);
  }

  // Clear filters
  onClearFilters() {
    this.searchQuery = '';
    this.selectedCategories = [];
    this.showOnlyDiscounted = false;
    this.showOnlyNew = false;
    this.priceRange = { min: 15, max: 100 };
    this.clearFilters.emit();
  }

  // Legacy compatibility
  filterProduct(event?: Event) {
    event?.preventDefault();
    this.applyPriceFilter();
  }
}
