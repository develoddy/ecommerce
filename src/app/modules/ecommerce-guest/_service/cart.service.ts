import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  public cart = new BehaviorSubject<Array<any>>([]);
  public currenteDataCart$ = this.cart.asObservable();
  constructor(
    public _authService: AuthService,
    public _http: HttpClient,
  ) { }

  // ------ CART -------------
  changeCart(DATACART:any) {
    let listCart = this.cart.getValue();
  console.log("DEBBUG listCart: ", listCart);
    let INDEX = listCart.findIndex((item:any) => item._id == DATACART._id);
      console.log("DEBBUG listCart INDEX: ", INDEX);
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
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/list?user_id="+user_id;
    
    // Retorna la petición HTTP y finaliza el loading al terminar
    return this._http.get(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
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
