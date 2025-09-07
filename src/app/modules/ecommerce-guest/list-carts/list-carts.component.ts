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

declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function alertDanger(message: string): any;
declare function alertSuccess(message: string): any;

// ---------- Destruir desde main ----------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupSliders($: any): any;

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
    this.showRelatedProducts();
    this.subscribeToWishlistData();

    setTimeout(() => {
      this.loadSPINER();
      setTimeout(() => {
        HOMEINITTEMPLATE($);
      }, 50);
    }, 750);
  }

  loadSPINER() {
    this.cartService.loading$.subscribe(isLoading => {
      //this.loading = isLoading;
      //setTimeout(() => {
        this.loading = !isLoading;
      //}, 550);
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
        this.updateTotalCarts();
      });
    } 
    this.sotoreCarts();
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
    const firstProductSlug = this.listCarts[0]?.product?.slug;
    this.slug = firstProductSlug;
    
    const LandingSubscriptions = this.ecommerceGuestService.showLandingProduct(this.slug).subscribe(
      (resp:any) => {
        this.handleProductResponse(resp);
        //  setTimeout(() => {
        //    HOMEINITTEMPLATE($);
        //  }, 150);
      }); 
    this.subscriptions.add(LandingSubscriptions);
  }

  private handleProductResponse(resp: any): void {
    this.product_selected = resp.product;
    this.related_products = resp.related_products;
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
    this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
  }

  inc(cart: any): void {
    this.changeQuantity(cart, true);
  }
  
  dec(cart: any): void {
    this.changeQuantity(cart, false);
  }

  changeQuantity(cart: any, increment: boolean): void {
    const quantityChange = increment ? 1 : -1;

    const newQty = parseInt(cart.cantidad, 10) + quantityChange;

    if (newQty < 1) {
      alertDanger("Debes tener al menos un producto en el carrito.");
      return;
    }

    cart.cantidad = newQty; //cart.cantidad += quantityChange;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));

    const cartData = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    };

    if(this.currentUser && !this.currentUser.email) { //if(this.currentUser.user_guest) {
      this.updateGuestCart(cartData);
    } else {
      this.updateUserCart(cartData);
    }
  }

  validateCartQuantity(cart: any) {
    if(cart.cantidad < 1) cart.cantidad = 1;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
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

  public storeRemoveCart(cart : any) {
    const isGuest = this.currentUser?.user_guest;
    if (isGuest) {
      this.removeCartLocalStorage(cart);
      setTimeout(() => {
        this.showRelatedProducts();
      }, 150);
      
    } else {
      this.removeCartDatabase(cart);
      setTimeout(() => {
        this.showRelatedProducts();
      }, 150);
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
