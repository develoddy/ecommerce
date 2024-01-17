import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  public cart = new BehaviorSubject<Array<any>>([]);
  public currenteDataCart$ = this.cart.asObservable();
  constructor(
    public _authService: AuthService,
    public _http: HttpClient,
  ) { }

  changeCart(DATACART:any) {
    let listCart = this.cart.getValue();
    let INDEX = listCart.findIndex((item:any) => item._id == DATACART._id);
    if (INDEX != -1) {
      listCart[INDEX] = DATACART;
    } else {
      listCart.unshift(DATACART);
    }
    this.cart.next(listCart);
  }

  resetCart() {
    let listCart:any = [];
    this.cart.next(listCart);
  }

  removeItemCart(DATACART:any) {
    let listCart = this.cart.getValue();
    let INDEX = listCart.findIndex((item:any) => item._id == DATACART._id);
    if (INDEX != -1) {
      listCart.splice(INDEX, 1);
    }
    this.cart.next(listCart);
  }

  registerCart(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/register";
    return this._http.post(URL, data, {headers: headers});
  }

  updateCart(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/update";
    return this._http.put(URL, data, {headers: headers});
  }

  listCarts(user_id:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/list?user_id="+user_id;
    return this._http.get(URL, {headers: headers});
  }

  deleteCart(cart_id:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/delete/"+cart_id;
    return this._http.delete(URL, {headers: headers});
  }

  apllyCupon(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/aplly_cupon";
    return this._http.post(URL, data, {headers: headers});
  }

  searchProduct(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let TIME_NOW = new Date().getTime();
    let URL = URL_SERVICE+"home/search_product?TIME_NOW="+TIME_NOW;
    return this._http.post(URL, data, {headers: headers});
  }
}
