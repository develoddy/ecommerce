import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { URL_FRONTEND } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { Subscription, combineLatest } from 'rxjs';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { WishlistService } from '../_service/wishlist.service';
import { SeoService } from 'src/app/services/seo.service';
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';
import { AnalyticsService } from 'src/app/services/analytics.service';

declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function alertDanger(message: string): any;
declare function alertSuccess(message: string): any;

// ---------- Destruir desde main ----------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupSliders($: any): any;
declare function collectionSlider4items($: any): any;

@Component({
  selector: 'app-list-carts',
  templateUrl: './list-carts.component.html',
  styleUrls: ['./list-carts.component.css']
})
export class ListCartsComponent implements OnInit, AfterViewInit, OnDestroy {
  euro = "€";

  listCarts: any[] = [];
  totalCarts: number = 0;
  totalDiscount: number = 0;
  codeCupon: string | null = null;
  couponErrorMessage: string = '';
  showCouponError: boolean = false;
  loading: boolean = false;
  currentUser: any = null;
  slug: string | null = null;
  product_selected: any = null;
  related_products: any = [];
  interest_products :any= [];
  REVIEWS:any=null;
  SALE_FLASH:any = null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  exist_review:any=null;

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  listWishlists: any = [];
  totalWishlist: number = 0;

  private subscriptions: Subscription = new Subscription(); // Mantener todas las subscripciones

  constructor(
    private router: Router,
    public ecommerceGuestService: EcommerceGuestService,
    private cartService: CartService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    //private titleService: Title, // seo
    //private metaService: Meta,
    private seoService: SeoService,
    public _wishlistService: WishlistService,
    public loader: LoaderService,
    private priceCalculationService: PriceCalculationService,
    public dynamicRouter: DynamicRouterService,
    private analyticsService: AnalyticsService
  ) {}
  
  ngAfterViewInit(): void {}

  ngOnInit() {
   
    this.setupSEO();
    this.checkUserAuthenticationStatus();
    this.getCarts();
    this.inizializeLoader();
    this.checkDeviceType();
    this.subscribeToWishlistData();
   
  }

  inizializeLoader() {
    // Subscribe to loader to initialize carousel after content loads
    this.subscriptions.add(
      this.loader.loading$.subscribe(isLoading => {
        if (!isLoading) {
          setTimeout(() => {
            HOMEINITTEMPLATE($);
            
            collectionSlider4items($);
          }, 150);
        } else {
          cleanupSliders($);
          cleanupHOMEINITTEMPLATE($);
          collectionSlider4items($);
        }
      })
    );
  }

  navigateToProduct(slug: string, discountId?: string) {
    // Guarda el estado para hacer scroll hacia arriba
    sessionStorage.setItem('scrollToTop', 'true');
    // Navega a la página del producto (SPA-friendly sin reload)
    this.dynamicRouter.navigateWithLocale(['shop', 'product', slug]);
  }

  private checkDeviceType() {
    const width = window.innerWidth;
    if (width <= 480) {
      this.isMobile = true;
      this.isTablet = false;
      this.isDesktop = false;
    } else if (width > 480 && width <= 768) {
      this.isMobile = false;
      this.isTablet = true;
      this.isDesktop = false;
    } else {
      this.isMobile = false;
      this.isTablet = false;
      this.isDesktop = true;
    }
  }

  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest
      ]).subscribe(([user, userGuest]) => {
        this.currentUser = user || userGuest;
      })
    );
  }

  private getCarts(): void{
    if (this.currentUser) {
      this.cartService.currenteDataCart$.subscribe((resp: any) => {
        this.listCarts = resp;
        
        
         this.showRelatedProducts();
        // Procesar precios con descuento para cada item del carrito
        this.processCartPrices();
        this.updateTotalCarts();
      });
    } 
    this.sotoreCarts();
  }

  updateCartPrices(): void {
    this.listCarts.forEach(cart => {
      const finalUnit = this.getFinalUnitPrice(cart);
      cart.finalUnitPrice = finalUnit;
      cart.finalSubtotal = +(finalUnit * cart.cantidad).toFixed(2);
    });

    // Actualiza totales
    this.totalCarts = this.listCarts.reduce((acc, cart) => acc + cart.finalSubtotal, 0);
    this.totalDiscount = this.getTotalDiscount();
  }

  /**
   * Procesa los precios de los items del carrito para calcular precios finales con descuento
   */
  private processCartPrices(): void {
    this.listCarts.forEach(cart => {
      const finalPrice = this.getFinalUnitPrice(cart);
      cart.finalUnitPrice = Number(finalPrice) || 0;
      cart.finalSubtotal = parseFloat((cart.finalUnitPrice * Number(cart.cantidad)).toFixed(2));
      cart.finalTotal = cart.finalSubtotal;

      // Actualiza subtotal y total usados en el template
    cart.subtotal = cart.finalSubtotal;
    cart.total = cart.finalTotal;
    });
  }

  /**
   * Obtiene el precio unitario final (con descuento si aplica)
   */
  getFinalUnitPrice(cart: any): number {
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);

    // Si no hay descuento aplicado, retornar precio original
    if (!cart.type_discount || !cart.discount) {
      return originalPrice;
    }

    const discountValue = parseFloat(cart.discount);
    
    // Verificar que el descuento sea válido
    if (isNaN(discountValue) || discountValue <= 0) {
      return originalPrice;
    }

    let priceAfterDiscount: number;
    
    if (cart.type_discount === 1) { 
      // Descuento porcentual
      if (cart.code_cupon) {
        // CUPONES REALES - aplicar redondeo .95
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        return this.priceCalculationService.formatPrice(priceAfterDiscount);
      } else if (cart.code_discount && !cart.code_cupon) {
        // FLASH SALE con descuento porcentual - usar el descuento como porcentaje
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        return this.priceCalculationService.formatPrice(priceAfterDiscount);
      } else {
        // CAMPAIGN DISCOUNTS - cart.discount contiene el PRECIO FINAL, no el porcentaje
        // Para campaign discounts, el backend ya envía el precio final calculado
        if (discountValue > 0 && discountValue < originalPrice) {
          // Si discount parece ser un precio final válido, aplicar .95 rounding
          return this.priceCalculationService.formatPrice(discountValue);
        } else {
          // Si no, tratar como porcentaje (fallback) y aplicar .95 rounding
          if (discountValue > 100) return originalPrice;
          priceAfterDiscount = originalPrice * (1 - discountValue / 100);
          priceAfterDiscount = Math.max(0, priceAfterDiscount);
          return this.priceCalculationService.formatPrice(priceAfterDiscount);
        }
      }
    } else if (cart.type_discount === 2) {
      // Descuento de monto fijo - Aplicar redondeo .95
      priceAfterDiscount = Math.max(0, originalPrice - discountValue);
      return this.priceCalculationService.formatPrice(priceAfterDiscount);
    } else {
      // Tipo de descuento no reconocido
      return originalPrice;
    }
  }



  /**
   * Verifica si un item del carrito tiene descuento aplicado
   */
  hasCartItemDiscount(cart: any): boolean {
    if (!cart || !cart.discount || !cart.type_discount) return false;
    
    const discountValue = parseFloat(cart.discount);
    if (isNaN(discountValue) || discountValue <= 0) return false;
    
    // Cupones reales tienen código
    if (cart.code_cupon) return true;
    
    // Flash Sales tienen code_discount sin code_cupon
    if (cart.code_discount && !cart.code_cupon) return true;
    
    // Para campaign discounts, verificar si hay descuento real
    if (cart.type_discount === 1) {
      const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
      return discountValue > 0 && discountValue < originalPrice;
    }
    
    return cart.type_discount === 2 && discountValue > 0;
  }

  /**
   * Obtiene el precio original antes del descuento
   */
  getOriginalUnitPrice(cart: any): number {
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  /**
   * Obtiene el tipo de descuento aplicado al producto en el carrito
   * @param cart Item del carrito
   * @returns Tipo de descuento como string
   */
  getDiscountType(cart: any): string {
    if (!cart || !this.hasCartItemDiscount(cart)) return '';
    
    // PRIORIDAD 1: Cupón - siempre tiene prioridad sobre cualquier otro descuento
    if (cart.code_cupon) {
      return `Cupón ${cart.code_cupon}`;
    }
    
    // PRIORIDAD 2: Usar type_campaign validado en backend (ÚNICA FUENTE DE VERDAD)
    // type_campaign: 1=Campaign Discount, 2=Flash Sale, 3=Cupón
    if (cart.type_campaign === 3) {
      return `Cupón ${cart.code_cupon || ''}`;
    } else if (cart.type_campaign === 2) {
      return 'Flash Sale';
    } else if (cart.type_campaign === 1) {
      return 'Campaign Discount';
    }
    
    // ⚠️ FALLBACK ELIMINADO - code_discount por sí solo NO define el tipo
    // El type_campaign debe venir del backend. Si no viene, no hay badge.
    return '';
  }

  /**
   * Obtiene las partes del precio (entero y decimal) usando el servicio
   */
  // getPriceParts(price: number) {
  //   if (!this.priceCalculationService) {
  //     return { integer: '0', decimals: '00', total: '0.00' };
  //   }
  //   return this.priceCalculationService.getPriceParts(price);
  // }

  getPriceParts(price: any) {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(numPrice);
  }

  /**
   * Verifica si hay algún producto en el carrito con descuento (para usar en template)
   */
  hasAnyCartDiscount(): boolean {
    return this.listCarts.some(cart => this.hasCartItemDiscount(cart));
  }

  /**
   * Cuenta cuántos productos tienen descuento aplicado (para usar en template)
   */
  getDiscountedItemsCount(): number {
    return this.listCarts.filter(cart => this.hasCartItemDiscount(cart)).length;
  }

  /**
   * Calcula el subtotal original (sin descuentos) de todos los productos
   */
  getOriginalSubtotal(): number {
    if (!this.listCarts || this.listCarts.length === 0) {
      return 0;
    }
    return this.listCarts.reduce((total: number, cart: any) => {
      const originalPrice = this.getOriginalUnitPrice(cart);
      return total + (originalPrice * cart.cantidad);
    }, 0);
  }

  /**
   * Calcula el total de descuento aplicado
   */
  getTotalDiscount(): number {
    if (!this.listCarts || this.listCarts.length === 0) {
      //console.log("🛒 getTotalDiscount: Carrito vacío");
      return 0;
    }
    return this.listCarts.reduce((total: number, cart: any) => {
      const originalPrice = this.getOriginalUnitPrice(cart);
      const finalPrice = this.getFinalUnitPrice(cart);
      const discountPerItem = Math.max(0, originalPrice - finalPrice);
      return total + (discountPerItem * cart.cantidad);
    }, 0);
  }

  getFormattedPrice(price: any) {
    if (typeof price === 'string') {
      price = parseFloat(price); // Convertir a número
    }
  
    if (isNaN(price)) {
      return { integerPart: "0", decimalPart: "00" }; // Manejo de error si el valor no es válido
    }
    
    const formatted = price.toFixed(2).split('.'); // Asegura siempre dos decimales
    return {
      integerPart: formatted[0], // Parte entera
      decimalPart: formatted[1]  // Parte decimal
    };
  }

  getDiscount() {
    let discount = 0;
    if ( this.SALE_FLASH ) {
      if (this.SALE_FLASH.type_discount == 1) {
        const price = this.product_selected.price_eur || this.product_selected.price || this.product_selected.price_usd;
        return (this.SALE_FLASH.discount*price*0.01).toFixed(2);
      } else {
        return this.SALE_FLASH.discount;
      }
    }
    return discount;
  }

/**
 * Obtiene la imagen correcta de la variedad (preview > default) o fallback al producto
 */
  getVarietyImage(cart: any): string {
    if (!cart.variedad?.files) return cart.product.imagen;

    // Buscamos primero la imagen tipo 'preview'
    const preview = cart.variedad.files.find((f:any) => f.type === 'preview');
    if (preview && preview.preview_url) return preview.preview_url;

    // Luego buscamos 'default'
    const def = cart.variedad.files.find((f:any) => f.type === 'default');
    if (def && def.preview_url) return def.preview_url;

    // Fallback al producto base
    return cart.product.imagen;
  }


  public sotoreCarts() {
    this.cartService.resetCart();
    if (this.currentUser && !this.currentUser.email) {
      this.listCartsLocalStorage();
    } else {
      this.listCartsDatabase();
    }
  }

  private listCartsDatabase(): void {
    this.cartService.listCarts(this.currentUser._id).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => {
        this.cartService.changeCart(cart);
      });
      this.trackViewCart(resp.carts);
    });
  }

  private listCartsLocalStorage(): void {
    this.cartService.listCartsCache("guest").subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => {
        this.cartService.changeCart(cart);
      });
      this.trackViewCart(resp.carts);
    });
  }

  /**
   * Dispara GA4 view_cart una sola vez con los items reales de la respuesta del backend
   */
  private trackViewCart(carts: any[]): void {
    if (!carts || carts.length === 0) {
      return;
    }

    const items = carts.map((cart: any) => ({
      item_id: cart.product._id,
      item_name: cart.product.title || cart.product.name,
      item_category: cart.product.categorie?.title,
      price: this.getFinalUnitPrice(cart),
      quantity: cart.cantidad
    }));

    const value = parseFloat(
      carts.reduce((sum: number, cart: any) => sum + (this.getFinalUnitPrice(cart) * cart.cantidad), 0).toFixed(2)
    );

    this.analyticsService.whenReady().then(() => {
      this.analyticsService.trackViewCart(value, items);
    });
  }

  private showRelatedProducts() {
    if (this.listCarts.length === 0) return;
  
    const firstProductSlug = this.listCarts[0]?.product?.slug;
    this.slug = firstProductSlug;
    
    const LandingSubscriptions = this.ecommerceGuestService.showLandingProduct(this.slug).subscribe(
      (resp:any) => {
        this.handleProductResponse(resp);
        // Reprocesar precios después de obtener productos relacionados
        this.processCartPrices();
        this.updateTotalCarts();
        //  setTimeout(() => {
        //    HOMEINITTEMPLATE($);
        //  }, 150);
      }); 
    this.subscriptions.add(LandingSubscriptions);
  }

  private handleProductResponse(resp: any): void {
    this.product_selected = resp.product;
    this.related_products = resp.related_products;
    this.interest_products = resp.interest_products;
    this.SALE_FLASH = resp.SALE_FLASH;
    this.REVIEWS = resp.REVIEWS;
    this.AVG_REVIEW = resp.AVG_REVIEW;
    this.COUNT_REVIEW = resp.COUNT_REVIEW;
  }

  goToCheckout(): void {
    this.subscriptionService.setShowSubscriptionSection(false);
    this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
  }

  updateTotalCarts(): void {
    this.totalCarts = this.listCarts.reduce((sum: number, item: any) => {
      // Usar el precio final unitario (con descuento si aplica)
      const finalUnitPrice = item.finalUnitPrice || this.getFinalUnitPrice(item);
      return sum + (finalUnitPrice * item.cantidad);
    }, 0);
    this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    
    // console.log('🛒 Total del carrito actualizado:', {
    //   totalItems: this.listCarts.length,
    //   totalPrice: this.totalCarts,
    //   itemsWithDiscount: this.listCarts.filter(item => this.hasCartItemDiscount(item)).length
    // });
  }

  inc(cart: any): void {
    this.changeQuantity(cart, true);
  }
  
  dec(cart: any): void {
    this.changeQuantity(cart, false);
  }

  // changeQuantity(cart: any, increment: boolean): void {
  //   const quantityChange = increment ? 1 : -1;

  //   let newQty = Number(cart.cantidad) + quantityChange; //const newQty = parseInt(cart.cantidad, 10) + quantityChange;

  //   if (newQty < 1) {
  //     alertDanger("Debes tener al menos un producto en el carrito");
  //     return;
  //   }

  //   cart.cantidad = newQty; //cart.cantidad += quantityChange;
  //   cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
  //   cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));

  //   const cartData = {
  //     _id: cart._id,
  //     cantidad: cart.cantidad,
  //     subtotal: cart.subtotal,
  //     total: cart.total,
  //     variedad: cart.variedad ? cart.variedad.id : null,
  //     product: cart.product._id,
  //   };

  //   if(this.currentUser && !this.currentUser.email) { //if(this.currentUser.user_guest) {
  //     this.updateGuestCart(cartData);
  //   } else {
  //     this.updateUserCart(cartData);
  //   }
  // } 

  changeQuantity(cart: any, increment: boolean): void {
    const quantityChange = increment ? 1 : -1;
    let newQty = Number(cart.cantidad) + quantityChange;

    if (newQty < 1) {
      alertDanger("Debes tener al menos un producto en el carrito.");
      return;
    }

    cart.cantidad = newQty;
    this.updateCartItem(cart);
  }

  validateCartQuantity(cart: any): void {
    let newQty = Number(cart.cantidad);

    if (isNaN(newQty) || newQty < 1) {
      newQty = 1;
      alertDanger("Debes tener al menos un producto en el carrito.");
    }

    cart.cantidad = newQty;
    this.updateCartItem(cart);
  }

  // validateCartQuantity(cart: any) {
  //   if(cart.cantidad < 1) cart.cantidad = 1;
  //   cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
  //   cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
  // }

  private updateCartItem(cart: any): void {
    // Actualizar con precio final (con descuento si aplica)
    const finalUnitPrice = this.getFinalUnitPrice(cart);
    cart.subtotal = parseFloat((finalUnitPrice * cart.cantidad).toFixed(2));
    cart.total = parseFloat((finalUnitPrice * cart.cantidad).toFixed(2));
    
    // Actualizar también los campos de precio final
    cart.finalUnitPrice = finalUnitPrice;
    cart.finalSubtotal = cart.subtotal;
    cart.finalTotal = cart.total;

    const cartData = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    };

    if (this.currentUser && !this.currentUser.email) {
      this.updateGuestCart(cartData);
    } else {
      this.updateUserCart(cartData);
    }
  }

  // Actualizar carrito del usuario autenticado
  private updateUserCart(cartData: any): void {
    
    this.cartService.updateCart(cartData).subscribe((resp: any) => {
      
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
      alertSuccess(resp.message_text);
      this.updateTotalCarts();
    });
  }

  // Actualizar carrito del usuario invitado
  private updateGuestCart(cartData: any): void {
    
    this.cartService.updateCartCache(cartData).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
      alertSuccess(resp.message_text);
      this.updateTotalCarts();
    });
  }

  public storeRemoveCart(cart: any) {
    if( this.currentUser && !this.currentUser.email) {
      this.removeCartLocalStorage(cart);
      setTimeout(() => {
        this.showRelatedProducts();
      }, 350);
      
    } else {
      this.removeCartDatabase(cart);
      setTimeout(() => {
        this.showRelatedProducts();
      }, 350);
    }
  }

  removeCartLocalStorage(cart: any): void {
    this.cartService.deleteCartCache(cart._id).subscribe(() => {
      this.cartService.removeItemCart(cart);
    });
  }

  removeCartDatabase(cart: any): void {
    this.cartService.deleteCart(cart._id).subscribe(() => {
      this.cartService.removeItemCart(cart);
    });
  }

  storeClearCart(): void {
    if (this.currentUser && !this.currentUser.email) {
      this.clearCartsCache();  // Limpiar carrito para invitados
    } else if (this.currentUser && this.currentUser._id) {
      this.clearCartsDatabase();  // Limpiar carrito para usuarios autenticados
    } else {
      console.error("Error: No se pudo determinar el estado del usuario.");
    }
  }
  
  clearCartsCache(): void {
    const isGuest = "Guest";  // O alguna otra lógica para obtener el identificador de invitados
    this.cartService.deleteAllCartCache(isGuest).subscribe((resp: any) => {
      this.listCarts = [];  // Limpiar la lista de artículos localmente
      this.updateTotalCarts();  // Actualizar el total de artículos
    }, (error: any) => {
      console.error("Error al vaciar el carrito de invitado:", error);
    });
  }

  clearCartsDatabase(): void {
    if (!this.currentUser || !this.currentUser._id) {
      console.error("Error: Intentando acceder a la base de datos sin un usuario autenticado.");
      return;
    }
  
    this.cartService.deleteAllCart(this.currentUser._id).subscribe((resp: any) => {
      console.log('Carrito eliminado desde la base de datos:', resp);
      this.sotoreCarts(); // Actualizar el carrito después de eliminarlo
    }, (error: any) => {
      console.error('Error al eliminar el carrito desde la base de datos:', error);
    });
  }

  /**
   * Verifica si hay un cupón ya aplicado en el carrito
   */
  hasActiveCoupon(): boolean {
    return this.listCarts.some(cart => cart.code_cupon && cart.code_cupon.trim() !== '');
  }

  /**
   * Obtiene el código del cupón actualmente aplicado
   */
  getActiveCouponCode(): string | null {
    const cartWithCoupon = this.listCarts.find(cart => cart.code_cupon && cart.code_cupon.trim() !== '');
    return cartWithCoupon ? cartWithCoupon.code_cupon : null;
  }

  /**
   * Verifica si el cupón que se intenta aplicar ya está activo
   */
  isSameCouponAlreadyApplied(newCouponCode: string): boolean {
    if (!newCouponCode || newCouponCode.trim() === '') return false;
    
    const activeCoupon = this.getActiveCouponCode();
    return activeCoupon !== null && activeCoupon.toLowerCase() === newCouponCode.toLowerCase();
  }

  /**
   * Verifica si hay productos elegibles para aplicar cupón (SIN campaign discount)
   */
  hasProductsEligibleForCoupon(): boolean {
    const eligibleProducts = this.listCarts.filter(cart => {
      // Un producto es elegible si NO tiene campaign discount
      return !this.hasCartItemDiscount(cart) || cart.code_cupon; // O ya tiene cupón aplicado
    });
    return eligibleProducts.length > 0;
  }

  /**
   * Obtiene la cantidad de productos elegibles para cupón
   */
  getEligibleProductsCount(): number {
    return this.listCarts.filter(cart => {
      return !this.hasCartItemDiscount(cart) || cart.code_cupon;
    }).length;
  }

  /**
   * Obtiene la cantidad de productos con campaign discount (no elegibles para cupón)
   */
  getCampaignDiscountProductsCount(): number {
    return this.listCarts.filter(cart => {
      return this.hasCartItemDiscount(cart) && !cart.code_cupon;
    }).length;
  }

  /**
   * Verifica si hay productos en el carrito que ya tienen descuento de campaña
   * (productos con discount pero sin code_cupon)
   */
  hasProductsWithCampaignDiscount(): boolean {
    const productsWithCampaign = this.listCarts.filter(cart => {
      // DEBUG: Log cada producto para entender qué está pasando
      // console.log('🔍 Checking cart item for campaign discount:', {
      //   product: cart.product?.title,
      //   discount: cart.discount,
      //   code_cupon: cart.code_cupon,
      //   type_discount: cart.type_discount,
      //   originalPrice: cart.variedad?.retail_price || cart.price_unitario
      // });

      // 1. Si no tiene discount o es 0, definitivamente NO es campaign discount
      if (!cart.discount || parseFloat(cart.discount) <= 0) {
        //console.log('❌ No discount found, not campaign discount');
        return false;
      }

      // 2. Si tiene cupón, NO es campaign discount
      if (cart.code_cupon) {
        //console.log('❌ Has coupon code, not campaign discount');
        return false;
      }

      // 3. Si no tiene type_discount, probablemente tampoco es campaign discount
      if (!cart.type_discount) {
        //console.log('❌ No type_discount, not campaign discount');
        return false;
      }

      const discountValue = parseFloat(cart.discount);
      const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
      
      // 4. Para ser campaign discount, el discount debe ser menor que el precio original
      // (indica que es un precio final con descuento, no un porcentaje)
      if (discountValue >= originalPrice) {
        //console.log('❌ Discount >= original price, likely not campaign discount');
        return false;
      }

      // 5. Usar la misma lógica que hasCartItemDiscount() para campaign detection
      const hasDiscount = this.hasCartItemDiscount(cart);
      //console.log(hasDiscount ? '✅ HAS CAMPAIGN DISCOUNT' : '❌ No campaign discount detected');
      
      return hasDiscount;
    });

    //console.log('🎯 Products with campaign discount found:', productsWithCampaign.length);
    return productsWithCampaign.length > 0;
  }
  
  applyCupon(): void {
    // Validar que se haya ingresado un código
    if (!this.codeCupon || this.codeCupon.trim() === '') {
      alertDanger('Por favor ingresa un código de cupón.');
      return;
    }

    // Normalizar cupón a mayúsculas para consistencia en mensajes
    const normalizedCoupon = this.codeCupon.toUpperCase();

    // Validar si el mismo cupón ya está aplicado
    if (this.isSameCouponAlreadyApplied(this.codeCupon)) {
      alertDanger(`El cupón "${normalizedCoupon}" ya está aplicado en tu carrito.`);
      return;
    }

    // Validar si hay otro cupón aplicado
    if (this.hasActiveCoupon()) {
      const activeCoupon = this.getActiveCouponCode();
      alertDanger(`Ya tienes el cupón "${activeCoupon?.toUpperCase()}" aplicado. Quítalo primero para aplicar uno nuevo.`);
      return;
    }

    // NUEVA LÓGICA SELECTIVA: Validar que haya al menos productos elegibles para cupón
    if (!this.hasProductsEligibleForCoupon()) {
      alertDanger('Todos los productos en tu carrito ya tienen descuentos aplicados.');
      return;
    }

    // 🔍 CAPTURAR ESTADO DEL CARRITO ANTES DE APLICAR CUPÓN
    const cartStateBeforeCoupon = this.listCarts.map(cart => ({
      id: cart._id,
      productId: cart.product._id,
      discount: cart.discount,
      code_cupon: cart.code_cupon,
      finalPrice: this.getFinalUnitPrice(cart)
    }));

    // Información para el usuario sobre aplicación selectiva
    const eligibleCount = this.getEligibleProductsCount();
    const campaignCount = this.getCampaignDiscountProductsCount();
    
    if (campaignCount > 0 && eligibleCount > 0) {
      // Caso mixto: algunos productos con campaign discount, otros elegibles
      console.log(`ℹ️ Aplicación selectiva: ${eligibleCount} productos elegibles, ${campaignCount} con descuentos previos`);
    }

    const data = {
      code: this.codeCupon,
      user_id: this.currentUser._id,
    };

    this.cartService.apllyCupon(data).subscribe((resp: any) => {
      if (resp.message === 403) {
        this.showCouponErrorMessage(resp.message_text);
      } else {
        // 🔄 RECARGAR CARRITO Y VALIDAR SI HUBO CAMBIOS REALES
        this.cartService.listCarts(this.currentUser._id).subscribe((reloadResp: any) => {
          // Actualizar el estado del carrito
          reloadResp.carts.forEach((cart: any) => {
            this.cartService.changeCart(cart);
          });

          // 🔍 COMPARAR ESTADO ANTES Y DESPUÉS
          const cartStateAfterCoupon = this.listCarts.map(cart => ({
            id: cart._id,
            productId: cart.product._id,
            discount: cart.discount,
            code_cupon: cart.code_cupon,
            finalPrice: this.getFinalUnitPrice(cart)
          }));

          // Verificar si ALGÚN producto recibió el cupón (comparación case-insensitive)
          const productsWithNewCoupon = cartStateAfterCoupon.filter(afterCart => {
            const beforeCart = cartStateBeforeCoupon.find(b => b.id === afterCart.id);
            return afterCart.code_cupon && 
                   this.codeCupon &&
                   afterCart.code_cupon.toLowerCase() === this.codeCupon.toLowerCase() && 
                   (!beforeCart?.code_cupon || (this.codeCupon && beforeCart.code_cupon.toLowerCase() !== this.codeCupon.toLowerCase()));
          });

          if (productsWithNewCoupon.length === 0) {
            // ❌ EL CUPÓN NO SE APLICÓ A NINGÚN PRODUCTO
            alertDanger('El cupón no se aplica a los productos de tu carrito.');
          } else {
            // ✅ EL CUPÓN SE APLICÓ EXITOSAMENTE
            if (campaignCount > 0 && eligibleCount > 0) {
              alertSuccess(`Cupón ${normalizedCoupon} aplicado correctamente a ${productsWithNewCoupon.length} producto(s). Los productos con descuentos previos mantienen sus precios especiales.`);
            } else {
              alertSuccess(`Cupón ${normalizedCoupon} aplicado correctamente a ${productsWithNewCoupon.length} producto(s).`);
            }
          }

          // Limpiar el input después de procesar
          this.codeCupon = '';
        });
      }
    });
  }

  /**
   * Método para mostrar mensaje de error temporal en el template
   */
  showCouponErrorMessage(message: string) {
    this.couponErrorMessage = message;
    this.showCouponError = true;
    
    // Ocultar el mensaje después de 4 segundos
    setTimeout(() => {
      this.showCouponError = false;
      this.couponErrorMessage = '';
    }, 6000);
  }

  /**
   * Remueve el cupón aplicado del carrito
   */
  removeCupon(): void {
    if (!this.hasActiveCoupon()) {
      alertDanger('No hay ningún cupón aplicado para remover.');
      return;
    }

    const activeCoupon = this.getActiveCouponCode();
    
    // Datos para remover cupón (enviar código vacío o null según tu API)
    const data = {
      code: null, // o '' según como maneje tu backend la remoción
      user_id: this.currentUser._id,
      action: 'remove' // flag opcional para indicar que es remoción
    };

    this.cartService.removeCupon(data).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
      } else {
        alertSuccess(`Cupón "${activeCoupon}" removido correctamente.`);
        this.codeCupon = ''; // Limpiar input
        this.sotoreCarts();
      }
    }, (error) => {
      // Si no existe el método removeCupon, usar applyCupon con código vacío
      this.cartService.apllyCupon({ code: '', user_id: this.currentUser._id }).subscribe((resp: any) => {
        alertSuccess(`Cupón "${activeCoupon}" removido correctamente.`);
        this.codeCupon = '';
        this.sotoreCarts();
      });
    });
  }

  private setupSEO(): void {
    this.seoService.updateSeo({
      title: 'Lista de carrito',
      description: 'Esta sección de carritos contiene camisetas para programadores',
      image: `${URL_FRONTEND.replace(/\/$/, '')}/assets/images/logo.png`
    });
  }

  /**
   * Verifica si el usuario actual es un guest (no registrado)
   */
  isGuestUser(): boolean {
    return this.currentUser && !this.currentUser.email;
  }

  private subscribeToWishlistData(): void {
    this.subscriptions.add(
      this._wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
        this.listWishlists = resp;
        this.totalWishlist = this.listWishlists.reduce((sum:any, item:any) => sum + parseFloat(item.total), 0);
      })
    );
  }

  ngOnDestroy(): void {
    // Desuscribir todas las suscripciones en el método OnDestroy
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
    cleanupSliders($);
    cleanupHOMEINITTEMPLATE($);
  }
}
