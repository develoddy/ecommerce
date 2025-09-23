import { Component, Input, OnInit, OnChanges } from '@angular/core';

@Component({
  selector: 'app-flash-sale',
  templateUrl: './flash-sale.component.html',
  styleUrls: ['./flash-sale.component.scss']
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
    //console.log('FlashProductList:', this.FlashProductList);
    
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
      //console.log('❌ No FlashProductList or FlashSales data');
      return;
    }
    
    //console.log(`Processing ${this.FlashProductList.length} products for discount labels`);
     console.log('FlashProductList:', this.FlashProductList);
    this.FlashProductList.forEach(product => {
      // Solo verificar si tiene descuento basado en finalPrice vs price_usd
      const hasDiscount = product.finalPrice && product.finalPrice < product.price_usd;
      product.hasDiscount = hasDiscount;
      
      if (hasDiscount) {
        // Verificar si el producto tiene descuento original de Flash Sale
        let realDiscountPercent = 0;
        
        // Buscar en FlashSales el descuento real configurado
        if (this.FlashSales && this.FlashSales.length) {
          for (const flash of this.FlashSales) {
            const isInFlash = flash.discounts_products?.some((fp: any) => {
              const flashProductId = fp.product?.id || fp.product?._id || fp.productId;
              const currentProductId = product.id || product._id;
              return flashProductId === currentProductId;
            });

            if (isInFlash && flash.type_discount === 1) {
              // Usar el descuento configurado, no el calculado después del redondeo
              realDiscountPercent = flash.discount;
              break;
            }
          }
        }
        
        // Si no encontramos el descuento real, calcularlo basado en los precios
        if (realDiscountPercent === 0) {
          realDiscountPercent = Math.round(((product.price_usd - product.finalPrice) / product.price_usd) * 100);
        }
        
        product.discountLabel = `¡Flash Sale –${realDiscountPercent}%!`;
        
      } else {
        product.discountLabel = null;
      }
    });
  }

}
