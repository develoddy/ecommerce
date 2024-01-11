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

  listCarts:any=[];
  totalCarts:any=0;

  constructor(
    public _router: Router,
    public _cartService: CartService,
  ) {

  }
  ngOnInit() {
    setTimeout(() => {
      sectionCart();
    }, 25);
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      console.log(resp);
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    });
  }

  dec(cart:any) {
    console.log(cart, "DEC");
    if (cart.cantidad - 1 == 0) {
      alertDanger("No puedes disminur un producto a 0");
      return;
    }
    cart.cantidad = cart.cantidad - 1;
    cart.subtotal = cart.price_unitario * cart.cantidad;
    cart.total = cart.price_unitario * cart.cantidad;

    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad._id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      console.log(resp);
    });
  }

  inc(cart:any) {
    console.log(cart, "INC");
    cart.cantidad = cart.cantidad + 1;
    cart.subtotal = cart.price_unitario * cart.cantidad;
    cart.total = cart.price_unitario * cart.cantidad;

    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad._id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      console.log(resp);
    }); 
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      console.log(resp);
      this._cartService.removeItemCart(cart);
    });
  }
}
