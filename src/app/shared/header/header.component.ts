import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
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



declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function sectionCart(): any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

  euro = "€";
  cartsCacheItems: any[] = [];
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

  currentUser: any = null;

  @ViewChild("filter") filter?: ElementRef;
  private subscriptions: Subscription = new Subscription();
  showSubscriptionSection: boolean = true;

  constructor(
    private router: Router,
    private cartService: CartService,
    public authService: AuthService,
    private wishlistService: WishlistService,
    private translate: TranslateService,
    private languageService: LanguageService,
    private ecommerceGuestService: EcommerceGuestService,
    private minicartService: MinicartService,
    private subscriptionService: SubscriptionService
  ) {
    translate.setDefaultLang('es');
    this.subscriptions.add(
      this.subscriptionService.showSubscriptionSection$.subscribe(value => {
        this.showSubscriptionSection = value;
      })
    );
  }

  ngOnInit() {
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
          console.log("Error: No hay usuario autenticado o invitado.");
        }
      })
    );
  }

  private processUserStatus(): void {
    this.storeListCarts();
    this.storeListWishlists();

    // Sincroniza el carrito después de procesar el usuario
    if (!this.currentUser?.user_guest) { // Si es un usuario autenticado
      this.syncUserCart();
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
      console.log("Error: Estado de usuario no definido");
    }
  }

  private syncUserCart(): void {
    if (!this.currentUser || !this.currentUser._id) {
        console.error("Error: Intentando sincronizar el carrito sin un usuario autenticado.");
        return;
    }

    const user_guest = "Guest";
    // Obtener artículos del carrito del usuario invitado y del usuario autenticado simultáneamente
    forkJoin({
        respCache: this.cartService.listCartsCache(user_guest),
        respDatabase: this.cartService.listCarts(this.currentUser._id)
    }).subscribe({
      next: ({ respCache, respDatabase }) => {
        const mergedCarts = this.mergeAndRemoveDuplicates(respDatabase.carts || [], respCache.carts || []);  // Combinar y eliminar duplicados antes de sincronizar
        this.syncCarts(mergedCarts).subscribe({ // Sincronizar los artículos combinados
          next: () => {
              this.deleteCachedItems(respCache.carts || []); // Eliminar artículos del carrito en cache después de la sincronización
          },
          error: (error: any) => {
              console.error("Error al sincronizar el carrito: ", error);
          }
        });
      },
      error: (error) => {
          console.error("Error al obtener los carritos: ", error);
      }
    });
  }
  
  private mergeAndRemoveDuplicates(cartsFromDatabase: any[], cartsFromCache: any[]): any[] {
    const combinedCarts = [...cartsFromDatabase, ...cartsFromCache];
    const uniqueCarts = Array.from(new Map(combinedCarts.map(cart => [`${cart.product._id}-${cart.variedad.id}`, cart])).values());
    return uniqueCarts;
  }

  private syncCarts(carts: any[]): Observable<any> {
    return this.cartService.syncCart(carts, this.currentUser._id).pipe(
        tap((syncResponse: any) => {
            console.log("Carrito sincronizado exitosamente: ", syncResponse);
        })
    );
  }

  private deleteCachedItems(cachedItems: any[]): void {
    const deleteRequests = cachedItems.map((cartItem: any) => 
      this.cartService.deleteCartCache(cartItem._id).pipe(
        catchError(error => {
            if (error.status === 404) {
                console.warn(`Artículo con ID ${cartItem._id} no encontrado en el cache, ya fue eliminado o no existe.`);
            } else {
                console.error(`Error al eliminar el artículo con ID ${cartItem._id}: `, error);
            }
            return of(null); // Permitir que el flujo continúe
        })
      ));

    forkJoin(deleteRequests).subscribe(() => {
        console.log("Se han procesado todas las solicitudes de eliminación.");
    });
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
      console.log("Error: Estado de usuario no definido");
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

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
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
    this.cartService.deleteCart(cart._id).subscribe((resp: any) => {
      this.cartService.removeItemCart(cart);
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
      alertSuccess("El producto ha sido eliminado correctamente de la cesta.");
      this.updateTotalCarts();
    });
  }
  
  dec(cart: any) {
    if (!this.validateDecrement(cart)) return;
  
    this.updateCartQuantity(cart, cart.cantidad - 1);
  }
  
  inc(cart: any) {
    this.updateCartQuantity(cart, cart.cantidad + 1);
  }
  
  private validateDecrement(cart: any): boolean {
    if (cart.cantidad - 1 === 0) {
      alertDanger("No puedes disminuir un producto a 0");
      return false;
    }
    return true;
  }
  
  private updateCartQuantity(cart: any, newQuantity: number) {
    cart.cantidad = newQuantity;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
  
    const data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    };
  
    this.cartService.updateCart(data).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
  
      alertSuccess(resp.message_text);
      this.updateTotalCarts(); // Actualiza el total del carrito
    });
  }
  
  updateTotalCarts(): void {
    this.totalCarts = this.listCarts.reduce((sum, item) => sum + parseFloat(item.total), 0);
    this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
  }

  goToCheckout(): void {
    this.showSubscriptionSection = false;
    this.router.navigateByUrl('/checkout');
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  closeMinicart(): void {
    this.minicartService.closeMinicart();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkDeviceType(); // Verifica el tamaño de la pantalla
  }
}
