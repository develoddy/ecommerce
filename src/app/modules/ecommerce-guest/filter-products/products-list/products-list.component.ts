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

  ngOnInit() {
    console.log('[ProductsListComponent][ngOnInit] products:', this.products);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.products) {
      console.log('[ProductsListComponent][ngOnChanges] products:', this.products);
    }
  }
}
