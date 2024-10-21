import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, fromEvent, Subscription } from 'rxjs';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { EcommerceGuestService } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
import { WishlistService } from 'src/app/modules/ecommerce-guest/_service/wishlist.service';
import { LanguageService } from 'src/app/services/language.service';
import { MinicartService } from 'src/app/services/minicartService.service';
import { SubscriptionService } from 'src/app/services/subscription.service';

declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function sectionCart(): any;
declare function alertDanger([]): any;
declare function alertWarning([]): any;
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
  CURRENT_USER_AUTHENTICATED: any = null;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  source: any;

  @ViewChild("filter") filter?: ElementRef;
  private subscriptions: Subscription = new Subscription();  // Consolidar las suscripciones

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
  }

  async ngOnInit() {
    this.subscriptions.add(
      this.subscriptionService.showSubscriptionSection$.subscribe(value => {
        this.showSubscriptionSection = value;
      })
    );

    this.verifyAuthenticatedUser(); // Verifica el usuario autenticado

    await this.loadCartData(); // Cargar datos del carrito

    if (this.router.url === '/checkout') {
      this.showSubscriptionSection = false;
    }

    this.subscribeToCartData(); // Suscripción a los datos del carrito
    this.subscribeToWishlistData(); // Suscripción a los datos de la lista de deseos
    this.subscribeToEcommerceConfig(); // Suscripción a la configuración de eCommerce

    this.checkDeviceType(); // Verifica el tipo de dispositivo
  }

  private async loadCartData(): Promise<void> {
    if (!this.CURRENT_USER_AUTHENTICATED) {
      this.cartsCacheItems = await this.cartService.loadCart();
      if (this.cartsCacheItems.length) {
        this.listCarts = this.cartsCacheItems;
        this.listCarts.forEach((cart: any) => {
          this.cartService.changeCart(cart);
        });
      }
    }
  }

  private verifyAuthenticatedUser(): void {
    this.subscriptions.add(
      this.cartService._authService.user.subscribe((user: any) => {
        if (user) {
          this.CURRENT_USER_AUTHENTICATED = user;
          this.cartService.listCarts(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
            resp.carts.forEach((cart: any) => this.cartService.changeCart(cart));
          });

          this.wishlistService.listWishlists(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
            resp.wishlists.forEach((wishlist: any) => this.wishlistService.changeWishlist(wishlist));
          });
        }
      })
    );
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkDeviceType(); // Verifica el tamaño de la pantalla
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
  }

  private subscribeToCartData(): void {
    this.subscriptions.add(
      this.cartService.currenteDataCart$.subscribe((resp: any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum, item) => sum + parseFloat(item.total), 0);
      })
    );
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
    this.subscriptions.unsubscribe();  // Desuscribir todas las suscripciones al destruir el componente
  }

  closeMinicart(): void {
    this.minicartService.closeMinicart();
  }
}
