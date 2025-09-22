import { Component, Input, OnInit, OnChanges } from '@angular/core';

@Component({
  selector: 'app-flash-sale',
  templateUrl: './flash-sale.component.html',
  styleUrls: ['./flash-sale.component.css']
})
export class FlashSaleComponent implements OnInit, OnChanges {

  @Input() FlashProductList: any[] = [];
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() euro: string = '€';
  @Input() isMobile: boolean = false;
  @Input() FlashSales: any[] = [];
  @Input() getRouterDiscount!: (product: any) => any;
  @Input() openModalToCart!: (product: any) => void;
  @Input() addWishlist!: (product: any, flashSale: any) => void;
  @Input() changeProductImage!: (product: any, image: string) => void;
  @Input() navigateToProduct!: (slug: string, discountId?: string) => void;

  ngOnInit() {
    console.log('=== FLASH SALE COMPONENT DEBUG ===');
    console.log('FlashSales data:', this.FlashSales);
    console.log('FlashProductList:', this.FlashProductList);
    
    // YA NO calcular descuentos - el padre ya lo hizo
    // Solo marcar los productos que tienen descuento
    this.markDiscountedProducts();
  }

  ngOnChanges() {
    // Recalcular cuando cambien los datos
    if (this.FlashProductList && this.FlashSales) {
      this.markDiscountedProducts();
    }
  }

  private markDiscountedProducts() {
    if (!this.FlashProductList || !this.FlashSales) {
      console.log('❌ No FlashProductList or FlashSales data');
      return;
    }
    
    console.log(`Processing ${this.FlashProductList.length} products for discount labels`);
    
    this.FlashProductList.forEach(product => {
      // Solo verificar si tiene descuento basado en finalPrice vs price_usd
      const hasDiscount = product.finalPrice && product.finalPrice < product.price_usd;
      product.hasDiscount = hasDiscount;
      
      if (hasDiscount) {
        const discountPercent = Math.round(((product.price_usd - product.finalPrice) / product.price_usd) * 100);
        product.discountLabel = `¡Flash Sale –${discountPercent}%!`;
      } else {
        product.discountLabel = null;
      }
      
      // Debug: mostrar los precios que YA fueron calculados por el padre
      console.log(`📦 Product: ${product.title}`);
      console.log(`  - Original: ${product.price_usd}€`);
      console.log(`  - Final: ${product.finalPrice}€`);
      console.log(`  - Has discount: ${product.hasDiscount}`);
      console.log(`  - Discount label: ${product.discountLabel}`);
      console.log(`  - Price parts: ${product.priceInteger}.${product.priceDecimals}`);
    });
  }

}
