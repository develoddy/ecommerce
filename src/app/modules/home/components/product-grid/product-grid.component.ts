
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss']
})
export class ProductGridComponent {
  @Input() currentUrl: string = '';
  @Input() ourProducts: any[] = [];
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() euro: string = '';
  @Input() isMobile: boolean = false;
  @Input() getRouterDiscount: any;
  @Input() getPriceParts: any;
  @Input() openModalToCart: any;
  @Input() addWishlist: any;
  @Input() changeProductImage: any;
  @Input() navigateToProduct: any;
  @Input() FlashSale: any;
  sanitizedUrl: SafeUrl = '';
  
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Angular requiere que ciertas URLs sean consideradas "seguras" para evitar errores de seguridad (XSS).
   * <link itemprop="url"> se considera un ResourceURL por Angular, por lo que debemos sanitizarla.
   * 
   * ngOnChanges detecta cambios en @Input() currentUrl y genera una versión segura de la URL
   * usando DomSanitizer.bypassSecurityTrustResourceUrl. Esto evita el error:
   * "unsafe value used in a resource URL context".
   */
  ngOnChanges() {
    console.log(this.ourProducts);
    
    if (this.currentUrl) {
      this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentUrl);
    }

    
    
    if (this.ourProducts && this.ourProducts.length > 0) {
      this.ourProducts = this.ourProducts.map(p => {
        const isBestSeller = p.count_review && p.count_review >= 3;
        const hasDiscount = this.getDiscountLabel(p) !== null;

        return {
          ...p,
          isBestSeller,
          hasDiscount
        };
      });
    }
  }

  // Vamos a montar la etiqueta “Mejor Vendido” en rojo 🔴 que se muestre solo si el producto tiene más de 20 ventas.
  // isBestSeller(product: any): boolean {
  //   return product.sales && product.sales > 20;
  // }


  // Ejemplo: productos añadidos hace menos de 30 días
  isTrending(product: any): boolean {
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return new Date(product.createdAt) >= thirtyDaysAgo;
  }


  getDiscountLabel(product: any): string | null {
    let discountPercent: number | null = null;

    // Solo aplicar Flash Sale si el producto está incluido
    const flashProduct = this.FlashSale?.DiscountProducts?.find((dp:any) => dp.productId === product.id);

    // Flash Sale
    if (flashProduct) { //if (this.FlashSale && this.FlashSale.type_discount === 1) {
      discountPercent = this.FlashSale.discount;
    } 
    // Campaña individual del producto
    else if (product.campaing_discount && product.campaing_discount.type_discount === 1) {
      discountPercent = product.campaing_discount.discount;
    }

    if (discountPercent) {
      return `Oferta –${discountPercent}%`; // puedes cambiar "Oferta" por "Rebaja" si quieres
    }

    return null;
  }

  // Metodo igual que arriba pero en este caso muestra la fecha de inicio y fin de la oferta
  // getDiscountLabel(product: any): string | null {
  //   let discountPercent: number | null = null;
  //   let startDate: string | null = null;
  //   let endDate: string | null = null;

  //   if (product.campaing_discount && product.campaing_discount.type_discount === 1) {
  //     discountPercent = product.campaing_discount.discount;
  //     startDate = product.campaing_discount.start_date;
  //     endDate = product.campaing_discount.end_date;
  //   } else if (this.FlashSale && this.FlashSale.type_discount === 1) {
  //     discountPercent = this.FlashSale.discount;
  //     startDate = this.FlashSale.start_date;
  //     endDate = this.FlashSale.end_date;
  //   }

  //   if (discountPercent) {
  //     let label = `¡Rebaja –${discountPercent}%!`;

  //     if (startDate && endDate) {
  //       const formatDate = (dateStr: string) => {
  //         const d = new Date(dateStr);
  //         const day = String(d.getDate()).padStart(2, '0');
  //         const month = String(d.getMonth() + 1).padStart(2, '0'); // +1 porque enero = 0
  //         const year = String(d.getFullYear()).slice(-2); // últimos 2 dígitos
  //         return `${day}.${month}.${year}`;
  //       };

  //       label += ` Del ${formatDate(startDate)} al ${formatDate(endDate)}`;
  //     }

  //     return label;
  //   }

  //   return null;
  // }
}
