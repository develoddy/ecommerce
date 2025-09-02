import { Component, Input, Output, EventEmitter, AfterViewInit, NgZone, OnChanges, SimpleChanges } from '@angular/core';

declare var $: any;
declare function productSlider5items($: any): any;

@Component({
  selector: 'app-related-products',
  templateUrl: './related-products.component.html',
  styleUrls: ['./related-products.component.scss']
})
export class RelatedProductsComponent implements AfterViewInit, OnChanges {
  @Input() related_products: any[] = [];
  @Input() product_selected: any;
  @Input() euro: string = '';
  @Output() navigateToProduct = new EventEmitter<{slug: string, discountId?: string}>();
  @Input() getDiscount: any;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initSlick();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['related_products'] && !changes['related_products'].firstChange) {
      this.initSlick();
    }
  }

  private initSlick() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        if (typeof productSlider5items === 'function') {
          productSlider5items($);
        }
      }, 550);
    });
  }
}
