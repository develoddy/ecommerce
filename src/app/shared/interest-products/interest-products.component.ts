import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-interest-products',
  templateUrl: './interest-products.component.html',
  styleUrls: ['./interest-products.component.scss']
})
export class InterestProductsComponent {
  @Input() interest_products: any[] = [];
  @Input() product_selected: any;
  @Input() euro = '';
  @Input() getDiscount: any;
  @Input() SALE_FLASH: any;

  @Output() navigateToProduct =
    new EventEmitter<{slug: string, discountId?: string}>();
}
