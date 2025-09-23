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

  // ===== SIZE SELECTOR METHODS =====
  selectedColors: { [key: string]: number } = {};
  selectedSizes: { [key: string]: string } = {};
  hoveredProduct: string | null = null;

  /**
   * Get available sizes for a product based on selected color
   * @param product - Product object
   * @returns Array of available sizes
   */
  getAvailableSizes(product: any): string[] {
    if (!product.variedades || !Array.isArray(product.variedades)) {
      return [];
    }

    // Get currently selected color for this product
    const productId = product.uniqueId || product.id || product._id;
    const currentColorIndex = this.selectedColors[productId] || 0;
    const currentColor = product.colores?.[currentColorIndex]?.color;

    // If no color selected, get all unique sizes
    if (!currentColor) {
      const allSizes = product.variedades
        .map((v: any) => v.valor)
        .filter((size: any) => size && typeof size === 'string') as string[];
      return [...new Set(allSizes)].sort(this.sortSizes);
    }

    // Get sizes for the selected color
    const sizesForColor = product.variedades
      .filter((v: any) => v.color === currentColor)
      .map((v: any) => v.valor)
      .filter((size: any) => size && typeof size === 'string') as string[];

    return [...new Set(sizesForColor)].sort(this.sortSizes);
  }

  /**
   * Sort sizes in logical order (S, M, L, XL, 2XL, etc.)
   * @param a - First size
   * @param b - Second size
   * @returns Sort order
   */
  private sortSizes(a: string, b: string): number {
    const sizeOrder: { [key: string]: number } = {
      'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9
    };
    
    const orderA = sizeOrder[a.toUpperCase()] || 999;
    const orderB = sizeOrder[b.toUpperCase()] || 999;
    
    if (orderA !== 999 && orderB !== 999) {
      return orderA - orderB;
    }
    
    // For numeric sizes or unknown sizes, sort alphabetically
    return a.localeCompare(b);
  }

  /**
   * Handle size selection
   * @param product - Product object
   * @param size - Selected size
   */
  onSizeSelect(product: any, size: string): void {
    const productId = product.uniqueId || product.id || product._id;
    this.selectedSizes[productId] = size;
  }

  /**
   * Check if a size is currently selected
   * @param product - Product object
   * @param size - Size to check
   * @returns boolean
   */
  isSizeSelected(product: any, size: string): boolean {
    const productId = product.uniqueId || product.id || product._id;
    return this.selectedSizes[productId] === size;
  }

  /**
   * Check if a size is available (has stock) for the current color
   * @param product - Product object
   * @param size - Size to check
   * @returns boolean
   */
  isSizeAvailable(product: any, size: string): boolean {
    if (!product.variedades || !Array.isArray(product.variedades)) {
      return false;
    }

    const productId = product.uniqueId || product.id || product._id;
    const currentColorIndex = this.selectedColors[productId] || 0;
    const currentColor = product.colores?.[currentColorIndex]?.color;

    // Find the specific variant for this color and size
    const variant = product.variedades.find((v: any) => 
      (!currentColor || v.color === currentColor) && v.valor === size
    );

    return variant && variant.stock > 0;
  }

  /**
   * Handle color selection
   * @param product - Product object
   * @param colorIndex - Selected color index
   */
  onColorSelect(product: any, colorIndex: number): void {
    const productId = product.uniqueId || product.id || product._id;
    this.selectedColors[productId] = colorIndex;
    // Clear selected size when color changes
    delete this.selectedSizes[productId];
  }

  /**
   * Handle mouse enter on product image
   * @param product - Product object
   */
  onProductHover(product: any): void {
    const productId = product.uniqueId || product.id || product._id;
    this.hoveredProduct = productId;
  }

  /**
   * Handle mouse leave on product image
   */
  onProductLeave(): void {
    this.hoveredProduct = null;
  }

  /**
   * Check if product is currently hovered
   * @param product - Product object
   * @returns boolean
   */
  isProductHovered(product: any): boolean {
    const productId = product.uniqueId || product.id || product._id;
    return this.hoveredProduct === productId;
  }

}
