import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';

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
    public _http: HttpClient,
  ) { }

  // ------- Nueva implementacion para guardar productos en cache --------


  //  Almacenar el carrito en Cache Storage
  async cacheCartData(cartData: any) {
    const cache = await caches.open(this.cacheName);
    await cache.put('/api/cart', new Response(JSON.stringify(cartData), {
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Obtener el carrito desde Cache Storage
  async getCartFromCache() {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match('/api/cart');
    return response ? await response.json() : null;
  }

  // Cargar el carrito desde el backend o Cache Storage
  // async loadCart() {
  //   const cachedCart = await this.getCartFromCache();
  //   if (cachedCart) {
  //     return cachedCart; // Devuelve el carrito desde Cache Storage
  //   } else {
  //     // Si no hay carrito en Cache, obtener del backend
  //     return this._http.get('/api/cart').toPromise();
  //   }
  // }

  // Guardar el carrito localmente
  saveCart(cart: any) {
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
    this.cacheCartData(cart); // Cachear el carrito
  }

  // Obtener el carrito de Local Storage
  getCart() {
    const cart = localStorage.getItem(this.cartKey);
    return cart ? JSON.parse(cart) : [];
  }

 
  syncCartWithBackend(data: any[], userId:any) {
    let headers = new HttpHeaders({ 'token': this._authService.token });
    let URL = URL_SERVICE+"cart/merge?user_id="+userId;
    return this._http.post(URL, {data}, {headers: headers});
  }


  // Obtener el carrito desde la base de datos
  //getCartFromBackend() {
    //return this._http.get('/api/cart');
    // this.loadingSubject.next(true);
    // let headers = new HttpHeaders({'token': this._authService.token});
    // let URL = URL_SERVICE+"cart/list?user_id="+user_id;
    
    // return this._http.get(URL, { headers: headers }).pipe(
    //   finalize(() => this.loadingSubject.next(false)) 
    // );
  //}

  // Cargar el carrito desde el backend o Cache Storage
  async loadCart() {
    const cachedCart = await this.getCartFromCache();
    if (cachedCart) {
      return cachedCart; // Devuelve el carrito desde Cache Storage
    } else {
      // Si no hay carrito en Cache, obtener del backend
      return this._http.get('/api/cart').toPromise();
    }
  }





















  // ------ CART -------------
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
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/list?user_id="+user_id;
    
    return this._http.get(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  deleteCart(cart_id:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"cart/delete/"+cart_id;
    return this._http.delete(URL, {headers: headers});
  }

  deleteAllCart(user_id: any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE + "cart/delete-all/" + user_id;
    return this._http.delete(URL, { headers: headers });
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
