import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  codeCupon: string | null = null;
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

  listWishlists: any = [];
  totalWishlist: number = 0;

  private subscriptions: Subscription = new Subscription(); // Mantener todas las subscripciones

  locale: string = "";
  country: string = "";

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public ecommerceGuestService: EcommerceGuestService,
    private cartService: CartService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    //private titleService: Title, // seo
    //private metaService: Meta,
    private seoService: SeoService,
    public _wishlistService: WishlistService,
    public loader: LoaderService,
    private priceCalculationService: PriceCalculationService
  ) {
    // Obtenemos `locale` y `country` de la ruta actual
    this.activatedRoute.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    });
  }
  
  ngAfterViewInit(): void {}

  ngOnInit() {
   
    this.setupSEO();
    this.checkUserAuthenticationStatus();
    this.getCarts();
    this.inizializeLoader();
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
    // Navega a la página del producto
    this.router
      .navigate(['/', this.locale, this.country, 'shop', 'product', slug])
      .then(() => {
        // Recarga la página
        window.location.reload();
      });
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
        console.log("----> resp > listCarts:", this.listCarts);
        
         this.showRelatedProducts();
        // Procesar precios con descuento para cada item del carrito
        this.processCartPrices();
        this.updateTotalCarts();
      });
    } 
    this.sotoreCarts();
  }

  /**
   * Procesa los precios de los items del carrito para calcular precios finales con descuento
   */
  private processCartPrices(): void {
    this.listCarts.forEach(cart => {
      // Calcular el precio final unitario
      cart.finalUnitPrice = this.getFinalUnitPrice(cart);
      
      // Calcular subtotal y total con precio final
      cart.finalSubtotal = cart.finalUnitPrice * cart.cantidad;
      cart.finalTotal = cart.finalSubtotal;
      
      // console.log(`💰 Procesando ${cart.product.title}:`, {
      //   precioOriginal: cart.price_unitario,
      //   precioFinal: cart.finalUnitPrice,
      //   tieneDescuento: this.hasCartItemDiscount(cart),
      //   cantidad: cart.cantidad,
      //   subtotalFinal: cart.finalSubtotal
      // });
    });
  }

  /**
   * Obtiene el precio unitario final (con descuento si aplica)
   */
  getFinalUnitPrice(cart: any): number {
    // Si hay descuento aplicado (type_discount y discount), usar el precio con descuento
    if (cart.type_discount && cart.discount) {
      return parseFloat(cart.discount);
    }
    
    // Si no hay descuento, usar precio de variedad o precio unitario
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  /**
   * Verifica si un item del carrito tiene descuento
   */
  hasCartItemDiscount(cart: any): boolean {
    if (!cart.type_discount || !cart.discount) return false;
    
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
    const discountedPrice = parseFloat(cart.discount);
    
    return discountedPrice < originalPrice;
  }

  /**
   * Obtiene el precio original antes del descuento
   */
  getOriginalUnitPrice(cart: any): number {
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  /**
   * Obtiene las partes del precio (entero y decimal) usando el servicio
   */
  getPriceParts(price: number) {
    if (!this.priceCalculationService) {
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
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
        return (this.SALE_FLASH.discount*this.product_selected.price_usd*0.01).toFixed(2);
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
    });
  }

  private listCartsLocalStorage(): void {
    this.cartService.listCartsCache("guest").subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => {
        this.cartService.changeCart(cart);
      });
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
    console.log("🚀 -------> [handleProductResponse] this.resp:", resp);
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
    this.router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
    //this._router.navigate(['/product', slug], { queryParams: { _id: discountId } })
      // .then(() => {
      //     // Recarga la página
      //     window.location.reload();
      // });
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
      console.error("Error: Usuario no autenticado.");
      return;
    }
  
    this.cartService.deleteAllCart(this.currentUser._id).subscribe((resp: any) => {
      this.listCarts = [];  // Limpiar la lista de artículos localmente
      this.updateTotalCarts();  // Actualizar el total de artículos
    }, (error: any) => {
      console.error("Error al vaciar el carrito de usuario autenticado:", error);
    });
  }
  
  applyCupon(): void {
    const data = {
      code: this.codeCupon,
      user_id: this.currentUser._id,
    };

    this.cartService.apllyCupon(data).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
      } else {
        alertSuccess(resp.message_text);
        //this.listAllCarts();
        this.sotoreCarts();
      }
    });
  }

  private setupSEO(): void {
    this.seoService.updateSeo({
      title: 'Lista de carrito',
      description: 'Esta sección de carritos contiene camisetas para programadores',
      image: `${URL_FRONTEND.replace(/\/$/, '')}/assets/images/logo.png`
    });
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
