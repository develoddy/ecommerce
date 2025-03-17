import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { Title, Meta } from '@angular/platform-browser';
import { URL_FRONTEND } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { Subscription, combineLatest } from 'rxjs';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { WishlistService } from '../_service/wishlist.service';

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
    private titleService: Title, // seo
    private metaService: Meta,
    public _wishlistService: WishlistService,
  ) {
    this.cartService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
    this.updateSeo();

    // Obtenemos `locale` y `country` de la ruta actual
    this.activatedRoute.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    });
  }
  
   ngAfterViewInit(): void {
  //   setTimeout(() => {
  //     HOMEINITTEMPLATE($);
  //     //this.showRelatedProducts();
  //   }, 150);
   }

  ngOnInit() {
    this.checkUserAuthenticationStatus();
    this.getCarts();
    this.showRelatedProducts();
    this.subscribeToWishlistData();

    setTimeout(() => {
      HOMEINITTEMPLATE($);
    }, 150);
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
    const isGuest = this.currentUser?.user_guest;
    if (isGuest) {
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
    this.cartService.listCartsCache(this.currentUser.user_guest).subscribe((resp: any) => {
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
    //this.router.navigateByUrl('/checkout');

    this.router.navigate(['/', this.locale, this.country, 'account', 'checkout']);
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

    if (cart.cantidad + quantityChange === 0) {
      alertDanger("Debes tener al menos un producto en el carrito.");
      return;
    }

    cart.cantidad += quantityChange;
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

    if(this.currentUser.user_guest) {
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
    if (this.currentUser && this.currentUser.user_guest) {
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
      console.log("Carrito de invitado vaciado:", resp);
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
      console.log("Carrito de usuario autenticado vaciado:", resp);
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

  private updateSeo(): void {

    let data = {
      title: "Lista de carrito",
      description: "Esta seccion de carritos contiene camisetas para programadores",
      imagen: ""
    }

    const { title, description, imagen } =  data;
    const productUrl = ``;
    this.titleService.setTitle(`${title} | LujanDev Oficial`);
    this.metaService.updateTag({ name: 'description', content: description || 'Descripción del producto' });
    this.updateMetaTags(productUrl, title, description, imagen);
  }

  private updateMetaTags(url: string, title: string, description: string, imageUrl: string): void {
    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: imageUrl },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ];
    metaTags.forEach((tag:any) => this.metaService.updateTag(tag));
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
