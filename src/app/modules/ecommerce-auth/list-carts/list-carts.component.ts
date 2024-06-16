import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../ecommerce-guest/_service/cart.service';

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
  listCarts:any=[];
  totalCarts:any=0;
  code_cupon:any=null;

  constructor(
    public _router: Router,
    public _cartService: CartService,
  ) {

  }
  ngOnInit() {
    setTimeout(() => {
      sectionCart();
    }, 25);


    this.listAllCarts();

    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });
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
      user_id: this._cartService._authService.user._id,

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
    this._cartService.resetCart();

    if ( this._cartService._authService.user ) {
     
      this._cartService.listCarts(this._cartService._authService.user._id).subscribe((resp:any) => {

        console.log("---- listAllCarts ---");
        console.log(resp);
        
        
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });
      });
    }
  }
}
