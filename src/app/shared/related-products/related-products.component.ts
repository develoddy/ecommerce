import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-related-products',
  templateUrl: './related-products.component.html',
  styleUrls: ['./related-products.component.scss']
})
export class RelatedProductsComponent {
  @Input() related_products: any[] = [];
  @Input() product_selected: any;
  @Input() euro = '';
  @Input() getDiscount: any;
  @Input() SALE_FLASH: any;

  @Output() navigateToProduct =
    new EventEmitter<{slug: string, discountId?: string}>();
}
