import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartManagerService {

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
   * Añade un producto al carrito
   */
  addToCart(productData: {
    product: any;
    selectedColor: any;
    selectedSize: any;
    quantity: number;
    code_discount: any;
    discount: any;
    user?: any;
    saleFlash?: any;
    campaignDiscount?: any;
  }): Observable<any> {
    this.loadingSubject.next(true);

    console.log("🛒 Añadiendo al carrito con datos:", productData);

    // Determinar el tipo de descuento correctamente
    let typeDiscount = null;
    let discountCode = null;
    
    if (productData.saleFlash) {
      // Flash Sale tiene prioridad
      typeDiscount = 2; // Flash Sale
      discountCode = productData.saleFlash._id;
    } else if (productData.campaignDiscount) {
      // Campaign Discount
      typeDiscount = 1; // Campaign Discount  
      discountCode = productData.campaignDiscount._id;
    }

    const cartItem = {
        user: productData.user?.email ? productData.user?._id : productData.user.id,
        user_status: productData.user?.email ? 'authenticated' : 'guest',
        product: productData.product.id || productData.product._id,
        type_discount: typeDiscount,
        cantidad: productData.quantity,
        variedad: productData.selectedSize?.id,
        code_cupon: null,
        code_discount: discountCode || productData.code_discount || null,
        discount: parseFloat(productData.discount.total),
        price_unitario: this.calculateUnitPrice(productData.product),
        subtotal: this.calculateSubtotal(productData.product, productData.quantity),
        total: this.calculateTotal(productData.product, productData.quantity)
    };

    console.log("Añadiendo cartItem:", cartItem);

    // Determinar endpoint según si hay usuario
    const endpoint = productData.user?.email 
      ? 'cart/register' 
      : 'cartCache/register';

    let URL = `${URL_SERVICE}${endpoint}`;

    let headers = new HttpHeaders();
    if (productData.user?.email && this._authService.token) {
        headers = headers.set('token', this._authService.token);
    }
    
    return this.http.post(URL, cartItem, { headers }).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Calcula el precio unitario con descuentos aplicados
   */
  calculateUnitPrice(product: any, flashSale: any = null): number {
    if (!product) return 0;

    let basePrice = product.price_usd || product.price_soles || 0;

    // Aplicar descuento de flash sale si existe
    if (flashSale) {
      if (flashSale.type_discount === 1) {
        // Descuento porcentual
        basePrice = basePrice - (basePrice * flashSale.discount / 100);
      } else if (flashSale.type_discount === 2) {
        // Descuento fijo
        basePrice = Math.max(0, basePrice - flashSale.discount);
      }
    }

    return basePrice;
  }

  /**
   * Calcula el subtotal para una cantidad específica
   */
  calculateSubtotal(product: any, quantity: number, flashSale: any = null): number {
    const unitPrice = this.calculateUnitPrice(product, flashSale);
    return unitPrice * quantity;
  }

  /**
   * Calcula el total incluyendo impuestos y otros cargos
   */
  calculateTotal(product: any, quantity: number, flashSale: any = null, additionalCharges: number = 0): number {
    const subtotal = this.calculateSubtotal(product, quantity, flashSale);
    return subtotal + additionalCharges;
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
   * Valida la disponibilidad de stock antes de añadir al carrito
   */
  validateStockAvailability(product: any, selectedVariety: any, quantity: number): boolean {
    if (!product || !selectedVariety) return false;

    const variety = product.variedades?.find((v: any) => v.id === selectedVariety.id);
    return variety && variety.stock >= quantity;
  }

  /**
   * Calcula el precio con descuento aplicado
   */
  getPriceWithDiscount(originalPrice: number, discountType: number, discountValue: number): number {
    if (discountType === 1) {
      // Descuento porcentual
      return originalPrice - (originalPrice * discountValue / 100);
    } else if (discountType === 2) {
      // Descuento fijo
      return Math.max(0, originalPrice - discountValue);
    }
    return originalPrice;
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