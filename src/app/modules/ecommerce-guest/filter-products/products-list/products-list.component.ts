import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';

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

  selectedColors: { [productId: string]: number } = {}; // Track selected color index for each product
  productImages: { [productId: string]: string } = {}; // Track current image for each product

  constructor(
    private priceCalculationService: PriceCalculationService
  ) {}

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

  /**
   * Check if a color is currently selected for a product
   * @param product - Product object or product ID
   * @param colorIndex - Color index to check
   * @returns boolean
   */
  isColorSelected(product: any, colorIndex: number): boolean {
    const productId = typeof product === 'string' ? product : (product.uniqueId || product.id || product._id);
    return this.selectedColors[productId] === colorIndex;
  }

  onColorSelect(product: any, colorIndex: number, newImage: string): void {
    const productId = product.uniqueId || product.id || product._id;
    
    if (!productId) {
      console.error('Product ID not found for color selection');
      return;
    }
    
    if (!newImage) {
      console.error('No image provided for color selection');
      return;
    }
    
    // Update selected color index for this specific product
    this.selectedColors[productId] = colorIndex;
    
    // Update the image tracking
    this.productImages[productId] = newImage;
    
    // Update the product's images immediately for instant feedback
    product.currentImage = newImage;
    product.imagen = newImage;
    
    // Also update the main product array for consistency
    const productIndex = this.products.findIndex(p => 
      (p.uniqueId || p.id || p._id) === productId
    );
    
    if (productIndex !== -1) {
      this.products[productIndex].imagen = newImage;
      this.products[productIndex].currentImage = newImage;
      
      // Force change detection by creating a new reference
      this.products = [...this.products];
    }
    
    // Add changing animation class for visual feedback
    product.isChanging = true;
    
    // Remove animation class after short animation
    setTimeout(() => {
      product.isChanging = false;
    }, 300);
    
    // Call the parent's changeProductImage function if provided
    if (this.changeProductImage) {
      this.changeProductImage(product, newImage);
    }
    
   //✅ Color changed successfully for product ${productId} to: ${newImage}`);
  }


   getDiscountLabel(product: any): string | null {
     // Solo manejar campaing_discount, NO Flash Sales
     if (product.campaing_discount && product.campaing_discount.type_discount === 1 && product.campaing_discount.type_campaign == 1) {
       const discountPercent = product.campaing_discount.discount;
       if (discountPercent && discountPercent > 0) {
         //console.log('🏷️ getDiscountLabel returning:', `¡Oferta –${discountPercent}%!`, 'for product:', product.title);
         return `¡Oferta –${discountPercent}%!`;
       }
     } // Los Flash Sales 
     else if (product.campaing_discount && product.campaing_discount.type_discount === 1 && product.campaing_discount.type_campaign == 2) {
       const discountAmount = product.campaing_discount.discount;
       if (discountAmount && discountAmount > 0) {
         return `Flash Sale –${discountAmount}%!`;
       }
     }
     return null;
   }

  



  /**
   * Calculate final price using PriceCalculationService (ensures .95 ending and proper discount logic)
   * @param product - Product object
   * @returns final price number
   */
  calculateFinalPrice(product: any): number {
    return this.priceCalculationService.calculateFinalPrice(product, []);
  }

  /**
   * Get original price (without discount)
   * @param product - Product object
   * @returns original price number
   */
  getOriginalPrice(product: any): number {
    return product.price_usd || 0;
  }

  /**
   * Check if product has any discount applied
   * @param product - Product object
   * @returns boolean
   */
  hasDiscount(product: any): boolean {
    const originalPrice = this.getOriginalPrice(product);
    const finalPrice = this.calculateFinalPrice(product);
    return finalPrice < originalPrice;
  }

  /**
   * Get price parts for final price (with PriceCalculationService)
   * @param product - Product object
   * @returns price parts object
   */
  getFinalPriceParts(product: any) {
    const finalPrice = this.calculateFinalPrice(product);
    return this.priceCalculationService.getPriceParts(finalPrice);
  }

  /**
   * Get original price parts (before discount)
   * @param product - Product object
   * @returns price parts object
   */
  getOriginalPriceParts(product: any) {
    const originalPrice = this.getOriginalPrice(product);
    return this.priceCalculationService.getPriceParts(originalPrice);
  }
}
