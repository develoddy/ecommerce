import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { Title, Meta } from '@angular/platform-browser';
import { URL_FRONTEND } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { Subscription, combineLatest } from 'rxjs';

declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function alertDanger(message: string): any;
declare function alertSuccess(message: string): any;

@Component({
  selector: 'app-list-carts',
  templateUrl: './list-carts.component.html',
  styleUrls: ['./list-carts.component.css']
})
export class ListCartsComponent implements OnInit {
  euro = "€";
  listCarts: any[] = [];
  //listCartsCache: any[] = [];
  totalCarts: number = 0;
  codeCupon: string | null = null;
  loading: boolean = false;
  currentUser: any = null;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private titleService: Title, // seo
    private metaService: Meta
  ) {
      this.cartService.loading$.subscribe(isLoading => {
        this.loading = isLoading;
      });
      this.updateSeo();
  }

  ngOnInit() {
    this.checkUserAuthenticationStatus();
    this.getCarts();
    this.initHomeTemplate();
  }

  private initHomeTemplate(): void {
    setTimeout(() => {
      HOMEINITTEMPLATE($);
    }, 50);
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

  async syncLocalCartWithBackend(): Promise<void> {
    if (this.currentUser) {
      const userId = this.currentUser._id;
      const localCart = await this.cartService.getCartFromCache();

      if (localCart && localCart.length) {
        this.cartService.syncCartWithBackend(localCart, userId).subscribe(
          (resp: any) => {
            if (resp.message === 403) {
              alertDanger(resp.message_text);
              return;
            }
            console.log("--- Despues de sincronizar como respuesta escupe: ", resp);
            localStorage.removeItem(this.cartService.cartKey);
            caches.delete(this.cartService.cacheName);
            this.getCarts();
          },
          error => {
            if (error.error.message === "EL TOKEN NO ES VALIDO") {
              this.cartService._authService.logout();
            }
          }
        );
      } else {
        this.getCarts();
      //this.listAllCarts();
      }
      
    }
  }

  addToCart(product: any): void {
    const currentCart = this.cartService.getCart();
    currentCart.push(product);
    this.cartService.saveCart(currentCart);
  }

  goToCheckout(): void {
    this.subscriptionService.setShowSubscriptionSection(false);
    this.router.navigateByUrl('/checkout');
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

    this.cartService.updateCart(cartData).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        cart.cantidad -= quantityChange;
        cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
        cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
        return;
      }
      this.updateTotalCarts();
    });
  }

  removeCart(cart: any): void {
    this.cartService.deleteCart(cart._id).subscribe(() => {
      this.cartService.removeItemCart(cart);
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
}
