import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';
import { CartApiService } from '../../_service/service_landing_product/cart-api.service';
import { CartOrchestratorService } from '../../../home/_services/product/cart-orchestrator.service';
import { Subscription } from 'rxjs';
import { CartService } from '../../_service/cart.service';
import { MinicartService } from 'src/app/services/minicartService.service';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ProductsListComponent implements OnInit, OnChanges {
  @Input() products: any[] = [];
  @Input() euro: string = '';
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() getPriceParts: any;
  @Input() getRouterDiscount: any;
  @Input() changeProductImage: any;
  @Input() currentUser: any; // Usuario actual para el carrito
  

  pageSize = 12;
  currentPage = 1;
  pagedProducts: any[] = [];
  totalPages = 1;

  // Para manejo de errores al añadir al carrito
  errorResponse: boolean = false;
  errorMessage: string = '';

  // Subscripciones para cleanup
  private subscriptions: Subscription = new Subscription();

  sanitizedUrl: SafeUrl = '';
  selectedColors: { [productId: string]: number } = {}; // Track selected color index for each product
  productImages: { [productId: string]: string } = {}; // Track current image for each product
  hoveredProduct: string | null = null; // Track which product is being hovered
  selectedSizes: { [productId: string]: string } = {}; // Track selected size for each product

  constructor(
    private priceCalculationService: PriceCalculationService,
    private cartApiService: CartApiService,
    private cartOrchestratorService: CartOrchestratorService,
    private cartService: CartService,
    private minicartService: MinicartService,
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

  /**
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
   * Handle size selection for a product - Adds product to cart automatically
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
    
    
    // Find the selected variety based on current color and size
    const currentColorIndex = this.selectedColors[productId] || 0;
    const currentColor = product.colores?.[currentColorIndex]?.color;
    
    let selectedVariety = null;
    
    if (product.variedades && Array.isArray(product.variedades)) {
      selectedVariety = product.variedades.find((v: any) => 
        v.valor === size && (!currentColor || v.color === currentColor)
      );
    }
    
    if (!selectedVariety) {
      this.showError('No se encontró la variedad seleccionada');
      return;
    }
    
    // Validate stock availability
    if (!this.cartOrchestratorService.validateStockAvailability(product, selectedVariety, 1)) {
      this.showError('No hay stock disponible para esta variedad');
      return;
    }
    
    // Build cart data using CartOrchestratorService with correct discount info
    const discountInfo = product.campaing_discount || null; // Only Campaign Discount in filter-products
    const cartData = this.cartOrchestratorService.buildCartData(
      product, 
      selectedVariety, 
      this.currentUser, 
      1, // quantity = 1
      discountInfo
    );
    this.subscriptions.add(
      this.cartApiService.addToCart(cartData).subscribe(
        (resp: any) => this.handleCartResponse(resp),
        (error: any) => this.handleCartError(error)
      )
    );
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
   * Handle cart error
   * @param error - Error object
   */
  private handleCartError(error: any): void {
    console.error('❌ Cart Error:', error);
    
    if (error?.error?.message === 'EL TOKEN NO ES VALIDO') {
      this.cartService._authService.logout();
      return;
    }
    
    // Handle other errors
    const errorMessage = error?.error?.message_text || error?.message || 'Error al añadir el producto al carrito';
    this.showError(errorMessage);
  }

  /**
   * Handle cart response after adding product
   * @param resp - Response from cart service
   */
  private handleCartResponse(resp: any): void {
    if (resp.message == 403) {
      this.errorResponse = true;
      this.errorMessage = resp.message_text;
      console.error('❌ Cart Error 403:', resp.message_text);
    } else {
      // Success: update cart and open minicart
      this.cartService.changeCart(resp.cart);
      this.minicartService.openMinicart();
      
      
      // Clear any previous errors
      this.errorResponse = false;
      this.errorMessage = '';
    }
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
   * Show error message
   * @param message - Error message to display
   */
  private showError(message: string): void {
    this.errorResponse = true;
    this.errorMessage = message;
    console.error('❌ ProductGrid Error:', message);
    
    // You can add more error handling here, like showing a toast notification
    // For now, just log the error
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
