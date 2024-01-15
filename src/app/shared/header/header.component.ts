import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  
  listCarts:any=[];
  totalCarts:any=0;
  user:any;

  constructor(
    public _router: Router,
    public _cartService: CartService,
  ) {

  }
  ngOnInit() {
    this.user = this._cartService._authService.user;
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    });
    if (this._cartService._authService.user) {
      this._cartService.listCarts(this._cartService._authService.user._id).subscribe((resp:any) => {
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });
      });
    }
  }

  isHome() {
    return this._router.url == "" || this._router.url == "/" ? true : false;
  }

  logout() {
    this._cartService._authService.logout();
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      console.log(resp);
      this._cartService.removeItemCart(cart);
    });
  }
}
