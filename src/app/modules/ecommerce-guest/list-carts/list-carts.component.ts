import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function sectionCart():any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-list-carts',
  templateUrl: './list-carts.component.html',
  styleUrls: ['./list-carts.component.css']
})
export class ListCartsComponent implements OnInit {
  euro = "€";

  // Cart Cache
  cartItems: any[] = [];

  // Cart BBDD
  listCarts:any=[];
  totalCarts:any=0;
  code_cupon:any=null;
  userId: any;
  loading: boolean = false;

  CURRENT_USER_AUTHENTICATED:any=null;

  constructor(
    public _router: Router,
    public _cartService: CartService,
    private subscriptionService: SubscriptionService,
  ) {}
  
  async ngOnInit() {

    this.verifyAuthenticatedUser();

    this._cartService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    setTimeout(() => {
      HOMEINITTEMPLATE($);
      //sectionCart();
    }, 50);

    this.listAllCarts();
    this.getCarts();
    
  }

  private verifyAuthenticatedUser(): void {
    this._cartService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
    });
  }

  getCarts() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this._cartService.currenteDataCart$.subscribe((resp:any) => {
        this.listCarts = resp;
        
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      });
    } else {
      // Usuario no autenticado: carga el carrito desde el local storage
      const localCart = this._cartService.getCart(); // Obtener carrito desde Local Storage
      if (localCart && localCart.length > 0) {
        this.listCarts = localCart;

        // Calcular el total de los productos en el carrito
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));

        console.log("Carrito desde Local Storage:", this.listCarts);
      } else {
        // Si no hay carrito en Local Storage
        this.listCarts = [];
        this.totalCarts = 0;
        console.log("No hay productos en el carrito local.");
      }       
    }
  }


  goToCheckout() {
    // Cambia el valor antes de navegar
    this.subscriptionService.setShowSubscriptionSection(false);
    this._router.navigateByUrl('/checkout')
  }

  updateTotalCarts() {
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });
  }

  dec(cart:any) {
    console.log(cart, "DEC");
    if (cart.cantidad - 1 == 0) {
      alertDanger("Tienes que tener al menos una cantidad de producto");
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
      console.log("Debugg: Decremento");
      console.log(resp);
      this.updateTotalCarts();
    });
  }

  inc(cart:any) {
    console.log(cart, "INC");
    cart.cantidad = cart.cantidad + 1;

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
          cart.cantidad = cart.cantidad - 1;
          cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
          cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
        return;
      }

      this.updateTotalCarts();
    }); 
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      console.log(resp);
      this._cartService.removeItemCart(cart);
    });
  }

  apllyCupon() {
    let data = {
      code: this.code_cupon,
      user_id: this.userId,//this._cartService._authService.user._id,

    }

    this._cartService.apllyCupon(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
      } else {
        alertSuccess(resp.message_text);
        this.listAllCarts();
      }
    });
  }



  listAllCarts() {

    // Resetea el carrito antes de cargar nuevos datos
    this._cartService.resetCart();

    // Cargar el carrito desde Local Storage o Cache Storage
    const localCart = this._cartService.getCart(); // Obtener carrito desde Local Storage

    if (localCart.length > 0) {
      localCart.forEach((cartItem: any) => {
        this._cartService.changeCart(cartItem); // Actualiza el carrito con los datos locales
      });
    } else {
      // Si no hay datos en Local Storage, intenta cargar desde Cache Storage
      this._cartService.loadCart().then((cachedCart) => {
        if (cachedCart) {
          cachedCart.forEach((cartItem: any) => {
            this._cartService.changeCart(cartItem); // Actualiza el carrito con los datos de Cache Storage
          });
        }
      });
    }

    // Si el usuario está autenticado, sincroniza con el backend
    if ( this.CURRENT_USER_AUTHENTICATED) {
      this._cartService.listCarts(this.userId).subscribe((resp:any) => {
        // Actualiza el carrito con los datos del backend
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });

        // Sincroniza los carritos locales con el backend
        //this._cartService.syncCartWithBackend().subscribe(() => {
        //  console.log("Carrito sincronizado con el backend");
        //});
        
      });
    }
  }
}
