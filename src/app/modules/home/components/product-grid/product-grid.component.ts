
import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { GridViewMode } from 'src/app/services/grid-view.service';

@Component({
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ProductGridComponent implements OnChanges {
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
  @Input() gridViewMode: GridViewMode = { columns: 4, type: 'grid', className: 'grid-4-col' };
  
  sanitizedUrl: SafeUrl = '';
  selectedColors: { [productId: string]: number } = {}; // Track selected color index for each product
  productImages: { [productId: string]: string } = {}; // Track current image for each product
  selectedSizes: { [productId: string]: string } = {}; // Track selected size for each product
  hoveredProduct: string | null = null; // Track which product is being hovered
  
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Angular requiere que ciertas URLs sean consideradas "seguras" para evitar errores de seguridad (XSS).
   * <link itemprop="url"> se considera un ResourceURL por Angular, por lo que debemos sanitizarla.
   * 
   * ngOnChanges detecta cambios en @Input() currentUrl y genera una versión segura de la URL
   * usando DomSanitizer.bypassSecurityTrustResourceUrl. Esto evita el error:
   * "unsafe value used in a resource URL context".
   */
  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ProductGrid - ngOnChanges triggered');
    
    if (changes['gridViewMode']) {
      console.log('📊 GridViewMode received:', this.gridViewMode);
      console.log('🏗️ Grid className:', this.gridViewMode?.className);
      console.log('📐 Grid columns:', this.gridViewMode?.columns);
      console.log('📋 Grid type:', this.gridViewMode?.type);
    }
    
    if (changes['FlashSale']) {
      console.log('💰 FlashSale data (IGNORADO en product-grid):', this.FlashSale);
    }
    
    if (changes['ourProducts']) {
      console.log('🔍 ProductGrid - Total products received:', this.ourProducts?.length || 0);
    }
  }  /**
   * Get available sizes for a product based on currently selected color
   * @param product - Product object
   * @returns Array of unique sizes
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
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const indexA = sizeOrder.indexOf(a);
    const indexB = sizeOrder.indexOf(b);
    
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  }

  /**
   * Handle size selection for a product
   * @param product - Product object
   * @param size - Selected size
   */
  onSizeSelect(product: any, size: string): void {
    const productId = product.uniqueId || product.id || product._id;
    
    if (!productId) {
      console.error('Product ID not found for size selection');
      return;
    }

    // Update selected size for this product
    this.selectedSizes[productId] = size;
    
    console.log(`✅ Size ${size} selected for product ${productId}`);
    
    // You can add additional logic here, like:
    // - Update stock information
    // - Change price if size affects price
    // - Call parent component method
  }

  /**
   * Check if a size is currently selected for a product
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
    const productIndex = this.ourProducts.findIndex(p => 
      (p.uniqueId || p.id || p._id) === productId
    );
    
    if (productIndex !== -1) {
      this.ourProducts[productIndex].imagen = newImage;
      this.ourProducts[productIndex].currentImage = newImage;
      
      // Force change detection by creating a new reference
      this.ourProducts = [...this.ourProducts];
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

  /**
   * Check if any color is selected for a product
   * @param product - Product object
   * @returns boolean
   */
  hasColorSelected(product: any): boolean {
    const productId = product.uniqueId || product.id || product._id;
    return this.selectedColors[productId] !== undefined;
  }

  /**
   * Handle image load errors
   * @param event - Error event
   */
  onImageError(event: any): void {
    console.error('Error loading image:', event.target.src);
    // You could set a fallback image here
    // event.target.src = 'assets/images/placeholder.jpg';
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


  hasDiscount(product: any): boolean {
    // Solo verificar si tiene descuento individual (campaing_discount)
    // Los Flash Sales se manejan en su propio componente
    if (product.campaing_discount && product.campaing_discount.type_discount) {
      //console.log('✅ hasDiscount TRUE for product:', product.title, 'discount:', product.campaing_discount.discount + '%');
      return true;
    }
    
    // Fallback: verificar si finalPrice es menor que price_usd
    const hasDiscountedPrice = product.finalPrice && product.finalPrice < product.price_usd;
    if (hasDiscountedPrice) {
      //console.log('💰 hasDiscount TRUE for product (by price):', product.title, 'finalPrice:', product.finalPrice, 'price_usd:', product.price_usd);
    }
    
    return hasDiscountedPrice;
  }

  /**
   * Genera las clases CSS para el grid basado en el número de columnas
   * @returns string con las clases CSS para Bootstrap
   */
  getGridClasses(): string {
    const columns = this.gridViewMode?.columns || 4; // Default a 4 columnas para desktop
    
    // Sistema RESPONSIVE: 2 columnas en móvil, número solicitado en desktop
    const classMap: { [key: number]: string } = {
      1: 'row-cols-1 row-cols-md-1', // Vista lista - 1 columna siempre
      2: 'row-cols-2 row-cols-md-2', // 2 columnas siempre
      3: 'row-cols-2 row-cols-md-3', // 2 en móvil, 3 en desktop
      4: 'row-cols-2 row-cols-md-4', // 2 en móvil, 4 en desktop  
      5: 'row-cols-2 row-cols-md-5'  // 2 en móvil, 5 en desktop
    };
    
    //console.log(`🔧 Grid classes for ${columns} columns:`, classMap[columns]);
    return classMap[columns] || classMap[4]; // Fallback a 4 columnas
  }

  getDiscountLabel(product: any): string | null {
    // Solo manejar campaing_discount, NO Flash Sales
    // Los Flash Sales tienen su propio componente separado
    if (product.campaing_discount && product.campaing_discount.type_discount === 1) {
      const discountPercent = product.campaing_discount.discount;
      if (discountPercent && discountPercent > 0) {
        //console.log('🏷️ getDiscountLabel returning:', `¡Oferta –${discountPercent}%!`, 'for product:', product.title);
        return `¡Oferta –${discountPercent}%!`;
      }
    }

    //console.log('🚫 getDiscountLabel returning NULL for product:', product.title, 'campaing_discount:', product.campaing_discount);
    return null;
  }
}
