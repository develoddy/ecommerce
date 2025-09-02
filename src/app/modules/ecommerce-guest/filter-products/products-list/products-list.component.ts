import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit, OnChanges {
  @Input() products: any[] = [];
  @Input() euro: string = '';
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() getPriceParts: any;
  @Input() getRouterDiscount: any;
  @Input() changeProductImage: any;

  pageSize = 12;
  currentPage = 1;
  pagedProducts: any[] = [];
  totalPages = 1;

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    if (!target || !target.value) return; 
    this.setPageSize(Number(target.value));
  }

  ngOnInit() {
    this.updatePagedProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.products) {
      this.currentPage = 1;
      this.updatePagedProducts();
    }
  }

  updatePagedProducts() {
    this.totalPages = Math.ceil(this.products.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedProducts = this.products.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedProducts();
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  setPageSize(size: number) {
    this.pageSize = +size;
    this.currentPage = 1;
    this.updatePagedProducts();
  }
}
