import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { WishlistService } from '../../../ecommerce-guest/_service/wishlist.service';
import { AuthService } from '../../../auth-profile/_services/auth.service';
import { Router } from '@angular/router';

declare function alertSuccess(message: string): void;
declare function alertDanger(message: string): void;

export interface WishlistItem {
  id?: string;
  user: string;
  product: any;
  type_discount?: string | null;
  discount: number;
  cantidad: number;
  variedad?: string | null;
  code_cupon?: string | null;
  code_discount?: string | null;
  price_unitario: number;
  subtotal: number;
  total: number;
}

export interface WishlistData {
  items: WishlistItem[];
  totalItems: number;
  totalAmount: number;
}

export interface WishlistOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistManagerService {

  private _wishlistData = new BehaviorSubject<WishlistData>({
    items: [],
    totalItems: 0,
    totalAmount: 0
  });

  public wishlistData$: Observable<WishlistData> = this._wishlistData.asObservable();

  constructor(
    private wishlistService: WishlistService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeWishlistSubscription();
  }

  /**
   * Inicializa la suscripción al servicio de wishlist existente
   */
  private initializeWishlistSubscription(): void {
    this.wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
      const wishlistData: WishlistData = {
        items: resp || [],
        totalItems: resp?.length || 0,
        totalAmount: this.calculateTotalAmount(resp || [])
      };
      this._wishlistData.next(wishlistData);
    });
  }

  /**
   * Calcula el monto total de la wishlist
   * @param items - Lista de items de la wishlist
   * @returns Monto total
   */
  private calculateTotalAmount(items: any[]): number {
    return items.reduce((sum: number, item: any) => sum + parseFloat(item.total || 0), 0);
  }

  /**
   * Agrega un producto a la wishlist con validaciones avanzadas
   * @param product - Producto a agregar
   * @param flashSale - Información de Flash Sale (opcional)
   * @param locale - Locale actual
   * @param country - País actual
   * @returns Observable con el resultado de la operación
   */
  addToWishlist(
    product: any,
    flashSale: any = null,
    locale: string,
    country: string
  ): Observable<WishlistOperationResult> {
    // Validar autenticación
    const authValidation = this.validateAuthentication(locale, country);
    if (!authValidation.success) {
      return of(authValidation);
    }

    // Validar producto
    const productValidation = this.validateProduct(product);
    if (!productValidation.success) {
      return of(productValidation);
    }

    // Preparar datos de la wishlist
    const wishlistData = this.prepareWishlistData(product, flashSale, authValidation.data.user);

    // Realizar la operación
    return this.wishlistService.registerWishlist(wishlistData).pipe(
      map((resp: any) => {
        if (resp.message == 403) {
          alertDanger(resp.message_text);
          return {
            success: false,
            message: resp.message_text,
            error: 'FORBIDDEN'
          };
        } else {
          this.wishlistService.changeWishlist(resp.wishlist);
          alertSuccess(resp.message_text);
          return {
            success: true,
            message: resp.message_text,
            data: resp.wishlist
          };
        }
      }),
      catchError((error) => {
        if (error.error?.message === 'EL TOKEN NO ES VALIDO') {
          this.authService.logout();
          return of({
            success: false,
            message: 'Token inválido. Redirigiendo al login...',
            error: 'INVALID_TOKEN'
          });
        }
        return of({
          success: false,
          message: 'Error al agregar producto a favoritos',
          error: error.error?.message || 'UNKNOWN_ERROR'
        });
      })
    );
  }

  /**
   * Valida la autenticación del usuario
   * @param locale - Locale actual
   * @param country - País actual
   * @returns Resultado de validación
   */
  private validateAuthentication(locale: string, country: string): WishlistOperationResult {
    const user = this.getCurrentUser();
    
    if (!user || !user.email) {
      alertSuccess('Autentifíquese para poder añadir el producto a favoritos');
      this.router.navigate(['/', country, locale, 'auth', 'login']);
      return {
        success: false,
        message: 'Por favor, autentifíquese para poder añadir el producto a favoritos',
        error: 'NOT_AUTHENTICATED'
      };
    }

    return {
      success: true,
      message: 'Usuario autenticado',
      data: { user }
    };
  }

  /**
   * Valida el producto antes de agregarlo a la wishlist
   * @param product - Producto a validar
   * @returns Resultado de validación
   */
  private validateProduct(product: any): WishlistOperationResult {
    if (!product || !product._id) {
      return {
        success: false,
        message: 'Producto inválido',
        error: 'INVALID_PRODUCT'
      };
    }

    if (!product.price_usd || product.price_usd <= 0) {
      return {
        success: false,
        message: 'Precio del producto inválido',
        error: 'INVALID_PRICE'
      };
    }

    return {
      success: true,
      message: 'Producto válido'
    };
  }

  /**
   * Prepara los datos para enviar a la wishlist
   * @param product - Producto
   * @param flashSale - Flash Sale
   * @param user - Usuario
   * @returns Datos preparados
   */
  private prepareWishlistData(product: any, flashSale: any, user: any): WishlistItem {
    const variedad_selected = this.getAvailableVariedad(product);
    const discount = this.calculateDiscount(product, flashSale);
    const subtotal = product.price_usd - discount;

    return {
      user: user._id,
      product: product._id,
      type_discount: flashSale?.type_discount || null,
      discount: flashSale?.discount || 0,
      cantidad: 1,
      variedad: variedad_selected?.id || null,
      code_cupon: null,
      code_discount: flashSale?._id || null,
      price_unitario: product.price_usd,
      subtotal: subtotal,
      total: subtotal * 1
    };
  }

  /**
   * Obtiene la primera variedad disponible del producto
   * @param product - Producto
   * @returns Variedad disponible o null
   */
  private getAvailableVariedad(product: any): any {
    if (!product.variedades || !Array.isArray(product.variedades)) {
      return null;
    }
    return product.variedades.find((v: any) => v.stock > 0) || null;
  }

  /**
   * Calcula el descuento aplicable
   * @param product - Producto
   * @param flashSale - Flash Sale
   * @returns Monto del descuento
   */
  private calculateDiscount(product: any, flashSale: any): number {
    if (!flashSale) return 0;
    
    if (flashSale.type_discount === 'percentage') {
      return (product.price_usd * flashSale.discount) / 100;
    } else if (flashSale.type_discount === 'fixed') {
      return flashSale.discount;
    }
    
    return 0;
  }

  /**
   * Obtiene el usuario actual desde localStorage o el servicio
   * @returns Usuario actual o null
   */
  private getCurrentUser(): any {
    try {
      const userFromStorage = localStorage.getItem('user');
      return userFromStorage ? JSON.parse(userFromStorage) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }

  /**
   * Remueve un producto de la wishlist
   * @param productId - ID del producto a remover
   * @returns Observable con el resultado
   */
  removeFromWishlist(productId: string): Observable<WishlistOperationResult> {
    // Esta funcionalidad dependería del método disponible en el WishlistService
    // Por ahora retornamos un placeholder
    return of({
      success: true,
      message: 'Funcionalidad de remover pendiente de implementación'
    });
  }

  /**
   * Verifica si un producto está en la wishlist
   * @param productId - ID del producto
   * @returns true si está en la wishlist
   */
  isInWishlist(productId: string): Observable<boolean> {
    return this.wishlistData$.pipe(
      map(data => data.items.some(item => item.product === productId))
    );
  }

  /**
   * Obtiene el número total de items en la wishlist
   * @returns Observable con el número de items
   */
  getTotalItems(): Observable<number> {
    return this.wishlistData$.pipe(
      map(data => data.totalItems)
    );
  }

  /**
   * Obtiene el monto total de la wishlist
   * @returns Observable con el monto total
   */
  getTotalAmount(): Observable<number> {
    return this.wishlistData$.pipe(
      map(data => data.totalAmount)
    );
  }

  /**
   * Obtiene todos los items de la wishlist
   * @returns Observable con los items
   */
  getWishlistItems(): Observable<WishlistItem[]> {
    return this.wishlistData$.pipe(
      map(data => data.items)
    );
  }

  /**
   * Limpia la wishlist
   */
  clearWishlist(): void {
    this._wishlistData.next({
      items: [],
      totalItems: 0,
      totalAmount: 0
    });
  }

  /**
   * Actualiza la wishlist con nuevos datos
   * @param items - Nuevos items de la wishlist
   */
  updateWishlist(items: any[]): void {
    const wishlistData: WishlistData = {
      items: items,
      totalItems: items.length,
      totalAmount: this.calculateTotalAmount(items)
    };
    this._wishlistData.next(wishlistData);
  }

  /**
   * Obtiene el estado actual de la wishlist
   * @returns Estado actual de la wishlist
   */
  getCurrentWishlistData(): WishlistData {
    return this._wishlistData.value;
  }
}