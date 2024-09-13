import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, fromEvent, Subscription } from 'rxjs';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { EcommerceGuestService } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
import { WishlistService } from 'src/app/modules/ecommerce-guest/_service/wishlist.service';
import { LanguageService } from 'src/app/services/language.service';
import { MinicartService } from 'src/app/services/minicartService.service';
declare var $:any;
//declare function headerIconToggle([]):any;
declare function HOMEINITTEMPLATE([]):any;
declare function sectionCart():any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit , AfterViewInit /*, OnDestroy*/ {

  euro = "€";
  selectedLanguage: string = 'ES';
  listCarts:any=[];
  listWishlist:any=[];
  totalCarts:any=0;
  totalWishlist:any=0;
  //user:any;
  //
  search_product:any=null;
  products_search:any=[];
  categories:any=[];

  CURRENT_USER_AUTHENTICATED:any=null;

  source:any;
  @ViewChild("filter") filter?:ElementRef;

  private cartSubscription: Subscription | undefined;
  private ecommerceSubscription: Subscription | undefined;
  private searchSubscription: Subscription | undefined;
  private miniCartSubscription: Subscription | undefined;

  constructor(
    public _router: Router,
    public _cartService: CartService,
    public _wishlistService: WishlistService,
    public translate: TranslateService,
    private languageService: LanguageService,
    public _ecommerceGuestService: EcommerceGuestService,
    private minicartService: MinicartService,
  ) {
    translate.setDefaultLang('es');
  }


  ngOnInit() {
    this.verifyAuthenticatedUser(); // Verifica el usuario autenticado
    this.subscribeToCartData(); // Suscripción a los datos del carrito
    this.subscribeToEcommerceConfig(); // Suscripción a la configuración inicial de eCommerce

    this.subscribeToWishlistData(); // Suscripción a los datos del cla lista de deseos
  }


  private verifyAuthenticatedUser(): void {
    this._cartService._authService.user.subscribe((user:any) => {
      this.CURRENT_USER_AUTHENTICATED = user;
      if ( user ) {
        this._cartService.listCarts(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
          resp.carts.forEach((cart: any) => {
            this._cartService.changeCart(cart);
          });
        });

        this._wishlistService.listWishlist(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {

          resp.wishlists.forEach((wishlist: any) => {
            this._wishlistService.changeWishlist(wishlist);
          });
        });

      } else {
        this.listCarts = [];
        this.totalCarts = 0;

        this.listWishlist = [];
        this.totalWishlist = 0;
      }
    });
  }

  private subscribeToCartData(): void {
    this.cartSubscription = this._cartService.currenteDataCart$.subscribe((resp: any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    });
  }

  private subscribeToWishlistData(): void {
    this.cartSubscription = this._wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
      this.listWishlist = resp;
      this.totalWishlist = this.listWishlist.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    });
  }

  private subscribeToEcommerceConfig(): void {
    this.ecommerceSubscription = this._ecommerceGuestService.configInitial().subscribe((resp: any) => {
      this.categories = resp.categories;
    });
  }
  
  updateTotalCarts() {
    this.cartSubscription = this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });
  }

  ngAfterViewInit(): void {
    if (this.filter) {
      this.source = fromEvent(this.filter?.nativeElement, "keyup");
      this.source.pipe(debounceTime(500)).subscribe((c:any) => {
        let data = {
          search_product: this.search_product,
        }
        if(this.search_product.length > 1){
          this._cartService.searchProduct(data).subscribe((resp:any) => {
            console.log(resp);
            
            this.products_search = resp.products;
          })
        }
      });
    } /*else {
      console.error("filter is undefined");
    }*/
  }

  dec(cart:any) {
    if (cart.cantidad - 1 == 0) {
      alertDanger("No puedes disminur un producto a 0");
      return;
    }
    cart.cantidad = cart.cantidad - 1;
    // cart.subtotal = cart.price_unitario * cart.cantidad;
    // cart.total = cart.price_unitario * cart.cantidad;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));

    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } 
      
      alertSuccess(resp.message_text);
      this.updateTotalCarts();
    });
  }

  inc(cart:any) {
    console.log("FRONT ___ ", cart);
    cart.cantidad = cart.cantidad + 1;
    //cart.subtotal = cart.price_unitario * cart.cantidad;
    //cart.total = cart.price_unitario * cart.cantidad;
    // cart.subtotal = Number((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    
    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } 
      
      alertSuccess(resp.message_text);
      
      this.updateTotalCarts();
    }); 
  }

  isHome() {
    return this._router.url == "" || this._router.url == "/" ? true : false;
  }

  logout() {
    this._cartService._authService.logout();
  }

  getRouterDiscount(product:any) {
    if (product.campaing_discount) {
      return {_id: product.campaing_discount._id};
    }
    return {};
  }

  getDiscountProduct(product:any) {
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount == 1) { // 1 porcentaje
        return (product.price_usd*product.campaing_discount.discount*0.01).toFixed(2);
      } else { // 2 es moneda
        return product.campaing_discount.discount;
      }
    }
    return 0;
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      this._cartService.removeItemCart(cart);

      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        alertSuccess("El producto ha sido eliminado correctamente de la cesta.")
      }
    });
  }

  searchProduct() {}

  closeMinicart() {
    this.minicartService.closeMinicart();
  }

  /*ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.ecommerceSubscription) {
      this.ecommerceSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.miniCartSubscription) {
      this.miniCartSubscription.unsubscribe();
    }
    
    console.log('HeaderComponent has been destroyed.');
  }*/
}
