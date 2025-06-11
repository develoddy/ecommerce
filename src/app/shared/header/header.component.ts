import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy, HostListener, EventEmitter, Output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, forkJoin, fromEvent, Observable, of, Subscription, tap } from 'rxjs';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { EcommerceGuestService } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
import { WishlistService } from 'src/app/modules/ecommerce-guest/_service/wishlist.service';
import { LanguageService } from 'src/app/services/language.service';
import { MinicartService } from 'src/app/services/minicartService.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { combineLatest } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { HeaderEventsService } from 'src/app/services/headerEvents.service';
declare var $: any;
declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;//declare function HOMEINITTEMPLATE([]):any;
declare function sliderRefresh(): any;
declare function pswp([]):any;
declare function productZoom([]):any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;
declare function cleanupHOMEINITTEMPLATE($: any): any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

  @Output() forceLogin = new EventEmitter<void>();

  euro = "€";
  //cartsCacheItems: any[] = [];
  selectedLanguage: string = 'ES';
  listCarts: any[] = [];
  listWishlists: any = [];
  totalCarts: number = 0;
  totalWishlist: number = 0;
  search_product: string | null = null;
  products_search: any[] = [];
  categories: any[] = [];
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  source: any;
  locale: string = "";
  country: string = "";
  currentUser: any = null;
  width: number = 100; // valor por defecto
  height: number = 100; // valor por defecto

  @ViewChild("filter") filter?: ElementRef;
  private subscriptions: Subscription = new Subscription();
  showSubscriptionSection: boolean = true;

  constructor(
    private router: Router,
    private cartService: CartService,
    public authService: AuthService,
    private activatedRoute: ActivatedRoute,
    private wishlistService: WishlistService,
    private ecommerceGuestService: EcommerceGuestService,
    private minicartService: MinicartService,
    private subscriptionService: SubscriptionService,
    private localizationService: LocalizationService,
    private headerEventsService: HeaderEventsService
  ) {
    this.subscriptions.add(
      this.subscriptionService.showSubscriptionSection$.subscribe(value => {
        this.showSubscriptionSection = value;
      })
    );
  }

  ngOnInit() {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;

    this.checkUserAuthenticationStatus();
    if (this.router.url === '/checkout') {
      this.showSubscriptionSection = false;
    }

    this.subscribeToCartData(); 
    this.subscribeToWishlistData();
    this.subscribeToEcommerceConfig();
    this.checkDeviceType();
  }

  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest
      ]).subscribe(([user, userGuest]) => {
        this.currentUser = user || userGuest; // Usa el usuario autenticado o invitado
        if (this.currentUser) {
          this.processUserStatus();  // Procesar el usuario
        } else {
          console.warn("Error: No hay usuario autenticado o invitado.");
        }
      })
    );
  }

  private processUserStatus(): void {
    this.storeListCarts();
    this.storeListWishlists();
    if (this.currentUser && this.currentUser.user_guest !== "Guest") { // Si el usuario no es un invitado
      let user_guest = "Guest";
      this.cartService.listCartsCache(user_guest).subscribe((resp: any) => {
        if (resp.carts.length > 0) {
          this.syncUserCart();
        }
      });
    }
  }

  private storeListCarts(): void {
    const isGuest = this.currentUser?.user_guest;
    if (isGuest) { // Es un invitado
      this.listCartsLocalStorage();
    } else if (!isGuest) { // Está autenticado
      this.cartService.resetCart();
      this.listCartsDatabase();
    } else {
      console.warn("Error: Estado de usuario no definido");
    }
  }

  /**
   * SINCRONIZAR AMBOS CARRITOS DE USUARIOS INVITADOS Y AUTENTICADOS
   * @returns 
   */
  private syncUserCart(): void {
    if ( !this.currentUser || !this.currentUser._id ) {
        console.error("Error: Intentando sincronizar el carrito sin un usuario autenticado.");
        return;
    }

    const user_guest = "Guest";
    // OBTENER ARTICULOS DEL CARRITO DEL USUARIO INVITADO Y DEL USUARIO AUTENTICADO SIMULTÁNEAMENTE
    forkJoin({
        respCache: this.cartService.listCartsCache(user_guest),
        respDatabase: this.cartService.listCarts(this.currentUser._id)
    }).subscribe({
      next: ({ respCache, respDatabase }) => {
        if (respCache && respDatabase) {
          // SINCRONIZAR AMBOS CARRITOS DE FORMA ORDENADA
          // COMPROBAR Y ELIMINAR DUPLICADOS ANTES DE SINCRONIZAR
          const mergedCarts = this.mergeAndRemoveDuplicates(respDatabase.carts || [], respCache.carts || []);
          
          // SINCRONIZAR EL CARRITO CON EL BACKEND SOLO SI ES NECESARIO
          this.cartService.syncCartWithBackend(mergedCarts, this.currentUser._id).subscribe({
            next: (resp: any) => {
              console.warn("Carrito sincronizado exitosamente: ", resp);
            },
            error: (error) => {
              console.error("Error al sincronizar el carrito: ", error);
            }
          });
        }
      },
      error: (error) => {
        console.error("Error al obtener los carritos: ", error);
      }
    });
  }

  private mergeAndRemoveDuplicates(databaseCarts: any[], cacheCarts: any[]): any[] {
    const combinedCarts = [...databaseCarts, ...cacheCarts];

    // Utilizar un Set para almacenar los IDs únicos (puedes usar productId y variedadId)
    const uniqueCarts = new Map();

    combinedCarts.forEach(cart => {
        const key = `${cart.product._id}-${cart.variedad.id}`; // Crear clave única
        if (!uniqueCarts.has(key)) {
            uniqueCarts.set(key, cart);
        }
    });

    return Array.from(uniqueCarts.values());
  }

  private listCartsDatabase(): void {
    if (!this.currentUser || !this.currentUser._id) {
      console.error("Error: Intentando acceder a la base de datos sin un usuario autenticado.");
      return;
    }
    this.cartService.listCarts(this.currentUser._id).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => this.cartService.changeCart(cart));
    });
  }
  
  private listCartsLocalStorage(): void {
    let user_guest = "Guest";
    this.cartService.listCartsCache(user_guest).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => this.cartService.changeCart(cart));
    });
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
  
  private subscribeToCartData(): void {
    this.subscriptions.add(
      this.cartService.currenteDataCart$.subscribe((resp: any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum, item) => sum + parseFloat(item.total), 0);
      })
    );
  }
  
  private storeListWishlists(): void {
    const isGuest = this.currentUser?.user_guest;
  
    if (isGuest) {
      this.listWishlistsLocalStorage();
    } else if (!isGuest) {
      this.listWishlistsDatabase();
    } else {
      console.warn("Error: Estado de usuario no definido");
    }
  }
  
  private listWishlistsDatabase(): void {
    if (!this.currentUser || !this.currentUser._id) {
      console.error("Error: Intentando acceder a la base de datos sin un usuario autenticado.");
      return;
    }
  
    this.wishlistService.listWishlists(this.currentUser._id).subscribe((resp: any) => {
      resp.wishlists.forEach((wishlist: any) => this.wishlistService.changeWishlist(wishlist));
    });
  }
  
  private listWishlistsLocalStorage(): void {
    // Implementar la lógica para obtener los favoritos del local storage
  }

  navigateToProduct(slug: string, discountId?: string) {
    this.router.navigate(['/', this.country, this.locale, 'shop', 'product', slug], { queryParams: { _id: discountId } })
      .then(() => {
          window.location.reload();
      });
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    // Ajusta el tamaño de la imagen según el tipo de dispositivo
    if (this.isMobile) {
        this.width = 80;  // tamaño para móviles
        this.height = 80; // tamaño para móviles
    } else {
        this.width = 100; // tamaño por defecto
        this.height = 100; // tamaño por defecto
    }
  }

  private subscribeToWishlistData(): void {
    this.subscriptions.add(
      this.wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
        this.listWishlists = resp;
        this.totalWishlist = this.listWishlists.reduce((sum:any, item:any) => sum + parseFloat(item.total), 0);
      })
    );
  }

  private subscribeToEcommerceConfig(): void {
    this.subscriptions.add(
      this.ecommerceGuestService.configInitial().subscribe((resp: any) => {
        this.categories = resp.categories;
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.filter) {
      this.source = fromEvent(this.filter.nativeElement, "keyup");
      this.subscriptions.add(
        this.source.pipe(debounceTime(500)).subscribe(() => {
          if (this.search_product && this.search_product.length > 1) {
            const data = { search_product: this.search_product };
            this.cartService.searchProduct(data).subscribe((resp: any) => {
              this.products_search = resp.products;
            });
          }
        })
      );
    }
  }

  searchProduct() {}
  
  getRouterDiscount(product:any) {
    if (product.campaing_discount) {
      return {_id: product.campaing_discount._id};
    }
    return {};
  }

  getDiscountProduct(product:any) {
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount == 1) { // 1 es porcentaje
        return (product.price_usd*product.campaing_discount.discount*0.01).toFixed(2);
      } else { // 2 es moneda
        return product.campaing_discount.discount;
      }
    }
    return 0;
  }

  removeCart(cart: any) {
    // Si es un usuario autenticado
    if(!this.currentUser?.user_guest) { 
      this.cartService.deleteCart(cart._id).subscribe((resp: any) => {
        this.cartService.removeItemCart(cart);
        if (resp.message === 403) {
          alertDanger(resp.message_text);
          return;
        }
        alertSuccess("El producto ha sido eliminado del carrito");
        this.updateTotalCarts();
      });
    } else {
      this.cartService.deleteCartCache(cart._id).subscribe((resp: any) => {
        this.cartService.removeItemCart(cart);
        if (resp.message === 403) {
          alertDanger(resp.message_text);
          return;
        }
        alertSuccess("El producto ha sido eliminado del carrito");
        this.updateTotalCarts();
      });
    }
  }
  
  dec(cart: any) {
    if (!this.validateDecrement(cart)) return;
  
    this.updateCartQuantity(cart, cart.cantidad - 1);
  }
  
  inc(cart: any) {
    this.updateCartQuantity(cart, cart.cantidad + 1);
  }

  goLogin() {
    this.headerEventsService.emitForceLogin(); // Cuando quieras forzar login
  }
   
  private updateCartQuantity(cart: any, newQuantity: number) {
    cart.cantidad = newQuantity;
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

  private validateDecrement(cart: any): boolean {
    if (cart.cantidad - 1 === 0) {
      alertDanger("No puedes disminuir un producto a 0");
      return false;
    }
    return true;
  }
  
  updateTotalCarts(): void {
    this.totalCarts = this.listCarts.reduce((sum, item) => sum + parseFloat(item.total), 0);
    this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
  }

  goToCheckout(): void {
    this.showSubscriptionSection = false;
    this.router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
  }

  logout() {
    this.authService.logout();
    this.cartService.resetCart();
  }

  private cleanupPSWP() {
    // Limpiar los eventos asignados por pswp()
    $('.prlightbox').off('click');

    // Si PhotoSwipe está activo o existe algún lightbox abierto, ciérralo
    const pswpElement = $('.pswp')[0];

    // Hacemos un casting explícito para acceder a PhotoSwipe y PhotoSwipeUI_Default en window
    const PhotoSwipe = (window as any).PhotoSwipe;
    const PhotoSwipeUI_Default = (window as any).PhotoSwipeUI_Default;

    if (pswpElement && typeof PhotoSwipe !== 'undefined') {
      let lightBox = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, [], {});
      
      // Si el lightBox está abierto, ciérralo
      if (lightBox) {
        lightBox.close();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
    cleanupHOMEINITTEMPLATE($);
  }

  closeMinicart(): void {
    this.minicartService.closeMinicart();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkDeviceType(); // Verifica el tamaño de la pantalla
  } 
}
