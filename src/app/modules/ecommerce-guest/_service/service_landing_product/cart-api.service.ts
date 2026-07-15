import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartApiService {

  // Estados reactivos para el carrito
  private cartItemsSubject = new BehaviorSubject<any[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();

  private totalPriceSubject = new BehaviorSubject<number>(0);
  public totalPrice$ = this.totalPriceSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient, 
    public _authService: AuthService
  ) { }

  /**
   * Añade un producto al carrito - Solo manejo de API, sin lógica de negocio
   */
  addToCart(cartItem: any): Observable<any> {
    this.loadingSubject.next(true);



    // Determinar endpoint según si hay usuario
    const endpoint = cartItem.user_status === 'authenticated' 
      ? 'cart/register' 
      : 'cartCache/register';

    let URL = `${URL_SERVICE}${endpoint}`;

    let headers = new HttpHeaders();
    if (cartItem.user_status === 'authenticated' && this._authService.token) {
        headers = headers.set('token', this._authService.token);
    }
    
    return this.http.post(URL, cartItem, { headers }).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }



  /**
   * Obtiene los items del carrito
   */
  getCartItems(user?: any): Observable<any> {
    this.loadingSubject.next(true);

    const endpoint = user?.email ? 'carts/list' : 'carts/list_guest';
    let URL = `${URL_SERVICE}${endpoint}`;

    return this.http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Actualiza la cantidad de un item en el carrito
   */
  updateCartItemQuantity(cartItemId: number, quantity: number, user?: any): Observable<any> {
    this.loadingSubject.next(true);

    const endpoint = user?.email ? 'carts/update' : 'carts/update_guest';
    let URL = `${URL_SERVICE}${endpoint}`;

    const updateData = {
      cart_id: cartItemId,
      cantidad: quantity
    };

    return this.http.put(URL, updateData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Elimina un item del carrito
   */
  removeCartItem(cartItemId: number, user?: any): Observable<any> {
    this.loadingSubject.next(true);

    const endpoint = user?.email ? 'carts/delete' : 'carts/delete_guest';
    let URL = `${URL_SERVICE}${endpoint}/${cartItemId}`;

    return this.http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Limpia todo el carrito
   */
  clearCart(user?: any): Observable<any> {
    this.loadingSubject.next(true);

    const endpoint = user?.email ? 'carts/clear' : 'carts/clear_guest';
    let URL = `${URL_SERVICE}${endpoint}`;

    return this.http.post(URL, {}).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Aplica un cupón de descuento
   */
  applyCoupon(couponCode: string, user?: any): Observable<any> {
    this.loadingSubject.next(true);

    const endpoint = user?.email ? 'carts/apply_coupon' : 'carts/apply_coupon_guest';
    let URL = `${URL_SERVICE}${endpoint}`;

    const couponData = {
      code_cupon: couponCode
    };

    return this.http.post(URL, couponData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }





  /**
   * Actualiza el estado local del carrito
   */
  updateLocalCartState(items: any[]): void {
    this.cartItemsSubject.next(items);
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    this.totalPriceSubject.next(total);
  }

  /**
   * Obtiene el estado actual del carrito
   */
  getCurrentCartState(): { items: any[], total: number } {
    return {
      items: this.cartItemsSubject.value,
      total: this.totalPriceSubject.value
    };
  }

  /**
   * Resetea el estado del carrito
   */
  resetCartState(): void {
    this.cartItemsSubject.next([]);
    this.totalPriceSubject.next(0);
  }
}