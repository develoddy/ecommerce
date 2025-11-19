import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, Observable, tap } from 'rxjs';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';

interface CartResponse {
  carts: any[]; // Cambia `any` por el tipo específico de los artículos de tu carrito.
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  public cartKey = 'cart';
  public cacheName = 'SHOPIN_CART_CACHE';

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  public cart = new BehaviorSubject<Array<any>>([]);
  public currenteDataCart$ = this.cart.asObservable();
  
  constructor(
    public _authService: AuthService, 
    public _http: HttpClient
  ) {}


  /**
   * ----------------------------------------------------------------
   * -               CART SERVICE                                   - 
   * ----------------------------------------------------------------
   **/
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
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/register";
    return this._http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  // updateCart(data:any) {
  //   this.loadingSubject.next(true);
  //   let headers = new HttpHeaders({'token': this._authService.token});
  //   let URL = URL_SERVICE+"cart/update";
  //   return this._http.put(URL, data, {headers: headers}).pipe(
  //     finalize(() => this.loadingSubject.next(false)) 
  //   );
  // }

  updateCart(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/update";
    return this._http.put(URL, data, {headers}); // nada de show/hide
  }

  listCarts(user_id:any): Observable<CartResponse> {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"cart/list?user_id="+user_id; 
    return this._http.get<CartResponse>(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  deleteCart(cart_id:any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/delete/"+cart_id;
    return this._http.delete(URL, {headers: headers}).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  deleteAllCart(user_id: any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE + "cart/delete-all/" + user_id;
    return this._http.delete(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  apllyCupon(data:any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/aplly_cupon";
    return this._http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  removeCupon(data:any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/remove_cupon";
    return this._http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  searchProduct(data:any) {
    this.loadingSubject.next(true);
    //let headers = new HttpHeaders({'token': this._authService.token});
    let headers = this._authService.token 
      ? new HttpHeaders({ 'token': this._authService.token }) 
      : undefined;

    let TIME_NOW = new Date().getTime();
    let URL = URL_SERVICE+"home/search_product?TIME_NOW="+TIME_NOW;

    return this._http.post(URL, data, {headers: headers}).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  syncCartWithBackend(data: any[], userId: any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({ 'token': this._authService.token });
    let URL = URL_SERVICE + "cart/merge?user_id=" + userId;
    return this._http.post(URL, { data }, { headers }).pipe(
        finalize(() => this.loadingSubject.next(false)),
        tap((response: any) => {
            if (response && response.carts) {
                // Actualiza el carrito con los productos sincronizados
                response.carts.forEach((cart: any) => this.changeCart(cart));
            }
        })
    );
  }


  /**
   * ----------------------------------------------------------------
   * -               CART CACHE SERVICE                             - 
   * ----------------------------------------------------------------
  **/
  listCartsCache(isGuest:any): Observable<CartResponse> {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"cartCache/list?isGuest="+isGuest;
    return this._http.get<CartResponse>(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  registerCartCache(data:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"cartCache/register";
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  updateCartCache(data:any) {
    let URL = URL_SERVICE+"cartCache/update";
    return this._http.put(URL, data,);
  }

  // syncCart(data: any[], userId: any) {
  //   return this.syncCartWithBackend(data, userId).pipe(
  //     tap((response: any) => {
  //       if (response.carts) {
  //         response.carts.forEach((cart: any) => this.changeCart(cart)); // Actualiza el carrito con los datos sincronizados
  //       }
  //     })
  //   );
  // }
  
  deleteCartCache(cart_id:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"cartCache/delete/"+cart_id;
    return this._http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  deleteAllCartCache(isGuest: any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "cartCache/delete-all/" + isGuest;
    return this._http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }
}
