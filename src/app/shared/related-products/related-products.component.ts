import { Component, Input, Output, EventEmitter, AfterViewInit, NgZone, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';

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
  @Input() SALE_FLASH: any;

  constructor(
    public loader: LoaderService,
    private ngZone: NgZone, 
    public priceService: PriceCalculationService
  ) {}

  ngAfterViewInit() {
  // console.log('🚀 ngAfterViewInit - related_products:', this.related_products);
  // console.log('🚀 ngAfterViewInit - product_selected:', this.product_selected);
  this.initSlick();
  
}

  ngOnChanges(changes: SimpleChanges) {
    // if (changes['related_products']) {
    //   console.log('🚀 ngOnChanges - related_products:', changes['related_products'].currentValue);
    // }
    // if (changes['product_selected']) {
    //   console.log('🚀 ngOnChanges - product_selected:', changes['product_selected'].currentValue);
    // }

    if (changes['related_products'] && !changes['related_products'].firstChange) {
      //console.log('🚀 ngOnChanges - related_products changed:', this.related_products);
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

  calculateFinalPrice(product: any): number {
    return this.priceService.calculateFinalPrice(product, this.SALE_FLASH);
  }

  public hasDiscount(product: any): boolean {
    return this.priceService.hasDiscount(product.price_usd, this.calculateFinalPrice(product));
  }

  public getDiscountAmount(product: any): number {
    return this.priceService.getDiscountAmount(product, this.SALE_FLASH);
  }

}
