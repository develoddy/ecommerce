import { Injectable } from '@angular/core';
import { CartService } from '../../../ecommerce-guest/_service/cart.service';
import { MinicartService } from '../../../../services/minicartService.service';
import { PriceCalculationService, PriceParts } from './price-calculation.service';

declare var $: any;

export interface CartData {
  user: string;
  user_status: string | null;
  product: string;
  type_discount: number | null;
  discount: number;
  cantidad: number;
  variedad: string | null;
  code_cupon: string | null;
  code_discount: string | null;
  price_unitario: number;
  subtotal: number;
  total: number;
}

export interface CartValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorType?: 'cantidad' | 'talla' | 'stock';
}

export interface CartOperationResult {
  success: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartManagerService {

  constructor(
    private cartService: CartService,
    private minicartService: MinicartService,
    private priceCalculationService: PriceCalculationService
  ) { }

  /**
   * Valida si un producto puede ser agregado al carrito
   * @param product_selected - El producto seleccionado
   * @param variedad_selected - La variedad seleccionada
   * @returns Resultado de la validación
   */
  validateCartAddition(product_selected: any, variedad_selected: any): CartValidationResult {
    // Validar cantidad
    const quantity = $('#qty-cart').val();
    if (quantity == 0) {
      return {
        isValid: false,
        errorMessage: 'Elija una cantidad válida para añadir al carrito',
        errorType: 'cantidad'
      };
    }

    // Validar talla para productos con inventario múltiple
    if (product_selected.type_inventario == 2) {
      if (!variedad_selected) {
        return {
          isValid: false,
          errorMessage: 'Por favor seleccione una talla',
          errorType: 'talla'
        };
      }

      // Validar stock disponible
      if (variedad_selected.stock < quantity) {
        return {
          isValid: false,
          errorMessage: 'La Cantidad excede el stock disponible. Elija menos unidades',
          errorType: 'stock'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Calcula el descuento para el producto seleccionado
   * @param product_selected - El producto seleccionado
   * @param SALE_FLASH - Información de Flash Sale
   * @returns Valor del descuento
   */
  calculateDiscount(product_selected: any, SALE_FLASH: any = null): number {
    let discount = 0;
    if (SALE_FLASH) {
      if (SALE_FLASH.type_discount == 1) {
        return parseFloat((
          SALE_FLASH.discount *
          product_selected.price_usd *
          0.01
        ).toFixed(2));
      } else {
        return SALE_FLASH.discount;
      }
    }
    return discount;
  }

  /**
   * Obtiene el precio con descuento aplicado
   * @param product_selected - El producto seleccionado
   * @param SALE_FLASH - Información de Flash Sale
   * @returns Precio con descuento como número
   */
  getPriceWithDiscount(product_selected: any, SALE_FLASH: any = null): number {
    const discount = this.calculateDiscount(product_selected, SALE_FLASH);
    return product_selected.price_usd - discount;
  }

  /**
   * Obtiene las partes del precio con descuento formateadas
   * @param product_selected - Producto seleccionado
   * @param SALE_FLASH - Información de la venta flash
   * @returns Objeto con integerPart y decimalPart
   */
  getPriceWithDiscountParts(product_selected: any, SALE_FLASH: any = null): { integerPart: number; decimalPart: string } {
    const priceWithDiscount = this.getPriceWithDiscount(product_selected, SALE_FLASH);
    const priceParts = this.priceCalculationService.getPriceParts(priceWithDiscount);
    
    return {
      integerPart: parseInt(priceParts.integer),
      decimalPart: priceParts.decimals
    };
  }

  /**
   * Determina si un producto es unitario basado en sus variedades
   * @param variedades - Lista de variedades del producto
   * @param valoresUnitarios - Valores que indican si es unitario
   * @returns true si es unitario, false si no
   */
  esProductoUnitario(variedades: any[], valoresUnitarios: string[]): boolean {
    for (const variedad of variedades) {
      if (valoresUnitarios.includes(variedad.valor)) {
        return false; // Si encuentra alguna de las variedades en valoresUnitarios, no es un producto unitario
      }
    }
    return true; // Si no encuentra ninguna de las variedades en valoresUnitarios, es un producto unitario
  }

  /**
   * Construye el objeto de datos para enviar al carrito
   * @param product_selected - El producto seleccionado
   * @param variedad_selected - La variedad seleccionada
   * @param currentUser - Usuario actual
   * @param SALE_FLASH - Información de Flash Sale
   * @returns Objeto con los datos del carrito
   */
  buildCartData(
    product_selected: any, 
    variedad_selected: any, 
    currentUser: any, 
    SALE_FLASH: any = null
  ): CartData {
    const quantity = parseInt($('#qty-cart').val() as string, 10);
    const discount = this.calculateDiscount(product_selected, SALE_FLASH);
    const subtotal = product_selected.price_usd - discount;

    return {
      user: currentUser.email ? currentUser._id : currentUser.id,
      user_status: currentUser.email ? null : 'guest',
      product: product_selected._id,
      type_discount: SALE_FLASH ? SALE_FLASH.type_discount : null,
      discount: SALE_FLASH ? SALE_FLASH.discount : 0,
      cantidad: quantity,
      variedad: variedad_selected ? variedad_selected.id : null,
      code_cupon: null,
      code_discount: SALE_FLASH ? (SALE_FLASH._id || SALE_FLASH.id) : null,
      price_unitario: product_selected.price_usd,
      subtotal: subtotal,
      total: subtotal * quantity,
    };
  }

  /**
   * Agrega un producto al carrito
   * @param cartData - Datos del carrito
   * @param isGuest - Si es usuario invitado
   * @returns Observable con la respuesta del servidor
   */
  addToCart(cartData: CartData, isGuest: boolean = false) {
    if (isGuest) {
      return this.cartService.registerCartCache(cartData);
    } else {
      return this.cartService.registerCart(cartData);
    }
  }

  /**
   * Maneja la respuesta exitosa del carrito
   * @param resp - Respuesta del servidor
   * @param onSuccess - Callback para éxito
   * @param onError - Callback para error
   */
  handleCartResponse(
    resp: any, 
    onSuccess?: (cart: any) => void,
    onError?: (message: string) => void
  ): void {
    if (resp.message == 403) {
      if (onError) {
        onError(resp.message_text);
      }
    } else {
      this.cartService.changeCart(resp.cart);
      this.minicartService.openMinicart();
      this.closeModal();
      
      if (onSuccess) {
        onSuccess(resp.cart);
      }
    }
  }

  /**
   * Maneja los errores del carrito
   * @param error - Error del servidor
   * @param onTokenError - Callback para error de token
   */
  handleCartError(error: any, onTokenError?: () => void): void {
    if (error.error.message === 'EL TOKEN NO ES VALIDO') {
      this.cartService._authService.logout();
      if (onTokenError) {
        onTokenError();
      }
    }
  }

  /**
   * Cierra el modal del carrito
   */
  private closeModal(): void {
    $('#quickview_modal').modal('hide');
  }

  /**
   * Proceso completo para agregar un producto al carrito
   * @param product_selected - El producto seleccionado
   * @param variedad_selected - La variedad seleccionada
   * @param currentUser - Usuario actual
   * @param SALE_FLASH - Información de Flash Sale
   * @param callbacks - Callbacks para diferentes eventos
   * @returns Promise con el resultado de la operación
   */
  async storeCart(
    product_selected: any,
    variedad_selected: any,
    currentUser: any,
    SALE_FLASH: any = null,
    callbacks?: {
      onValidationError?: (error: CartValidationResult) => void;
      onSuccess?: (cart: any) => void;
      onError?: (message: string) => void;
      onTokenError?: () => void;
    }
  ): Promise<CartOperationResult> {
    
    // Validar antes de proceder
    const validation = this.validateCartAddition(product_selected, variedad_selected);
    if (!validation.isValid) {
      if (callbacks?.onValidationError) {
        callbacks.onValidationError(validation);
      }
      return {
        success: false,
        errorMessage: validation.errorMessage
      };
    }

    // Construir datos del carrito
    const cartData = this.buildCartData(product_selected, variedad_selected, currentUser, SALE_FLASH);
    
    // Determinar si es usuario invitado
    const isGuest = currentUser && !currentUser.email;

    try {
      // Agregar al carrito
      const response = await this.addToCart(cartData, isGuest).toPromise();
      
      // Manejar respuesta
      this.handleCartResponse(
        response,
        callbacks?.onSuccess,
        callbacks?.onError
      );

      return { success: true };

    } catch (error) {
      this.handleCartError(error, callbacks?.onTokenError);
      return {
        success: false,
        errorMessage: 'Error al agregar al carrito'
      };
    }
  }
}