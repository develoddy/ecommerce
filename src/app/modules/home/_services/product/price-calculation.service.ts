import { Injectable } from '@angular/core';

export interface PriceParts {
  integer: string;
  decimals: string;
  total: string;
}

export interface FlashSale {
  id: string;
  type_discount: number; // 1 = percentage, 2 = fixed amount
  discount: number;
  discounts_products: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PriceCalculationService {

  constructor() { }

  /**
   * Calcula el precio final de un producto aplicando descuentos de Flash Sale o campaña individual
   * @param product Producto a calcular
   * @param flashSales Array de Flash Sales activas
   * @returns Precio final con 2 decimales estándar
   */
  calculateFinalPrice(product: any, flashSales: FlashSale[] = []): number {
    let discount = 0;
    let priceAfterDiscount = product.price_usd;
  
    // Verificar si el producto está en Flash Sale
    if (flashSales && flashSales.length) {
      for (const flash of flashSales) {
        const isInFlash = flash.discounts_products.some((fp: any) => {
          const flashProductId = fp.product?.id || fp.product?._id || fp.productId;
          const currentProductId = product.id || product._id;
          return flashProductId === currentProductId;
        });

        if (isInFlash) {
          // Aplicar descuento de Flash Sale
          if (flash.type_discount === 1) {
            discount = product.price_usd * flash.discount * 0.01;
          } else if (flash.type_discount === 2) {
            discount = flash.discount;
          }
          
          priceAfterDiscount = product.price_usd - discount;
          return this.formatPrice(priceAfterDiscount);
        }
      }
    }
    
    // Si no hay Flash Sale o el producto no está en Flash Sale, verificar campaña individual
    if (product.campaing_discount && product.campaing_discount.type_discount) {
      if (product.campaing_discount.type_discount === 1) { // Descuento por %
        discount = product.price_usd * product.campaing_discount.discount * 0.01;
      } else if (product.campaing_discount.type_discount === 2) { // Descuento por moneda
        discount = product.campaing_discount.discount;
      }
      
      priceAfterDiscount = product.price_usd - discount;
      return this.formatPrice(priceAfterDiscount);
    }

    // Si no hay ningún descuento, devolver precio original con formato estándar
    return this.formatPrice(product.price_usd);
  }

  /**
   * Formatea precio a 2 decimales exactos usando redondeo estándar
   * Mantiene consistencia con Printful, Stripe, PayPal y base de datos
   * @param price Precio a formatear
   * @returns Precio con 2 decimales exactos
   */
  formatPrice(price: number): number {
    if (!price || price < 0) {
      return 0.00;
    }
    return parseFloat(price.toFixed(2));
  }

  /**
   * Calcula el monto de descuento para un producto
   * @param product Producto
   * @param flashSales Array de Flash Sales activas
   * @returns Monto del descuento aplicado
   */
  getDiscountAmount(product: any, flashSales: FlashSale[] = []): number {
    let discount = 0;

    // Revisar todas las Flash Sales activas
    if (flashSales && flashSales.length) {
      for (const flash of flashSales) {
        const isInFlash = flash.discounts_products.some(
          (dp: any) => dp.product.id === product.id || dp.product._id === product._id
        );
        if (isInFlash) {
          // Aplicar descuento de Flash Sale
          if (flash.type_discount === 1) { // porcentaje
            discount = parseFloat((product.price_usd * flash.discount * 0.01).toFixed(2));
          } else if (flash.type_discount === 2) { // valor fijo
            discount = flash.discount;
          }
          return discount;
        }
      }
    }

    // Si no pertenece a ninguna Flash Sale, revisar campaña individual
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount === 1) { // porcentaje
        discount = parseFloat(
          (product.price_usd * product.campaing_discount.discount * 0.01).toFixed(2)
        );
      } else if (product.campaing_discount.type_discount === 2) { // valor fijo
        discount = product.campaing_discount.discount;
      }
    }

    return discount;
  }

  /**
   * Separa un precio en parte entera y decimal
   * @param price Precio a separar
   * @returns Objeto con integer, decimals y total
   */
  getPriceParts(price: number): PriceParts {
    const priceFixed = price.toFixed(2);
    const [integer, decimals] = priceFixed.split('.');
    return { 
      integer, 
      decimals, 
      total: priceFixed 
    };
  }

  /**
   * Calcula el precio con descuento para visualización en componentes
   * @param originalPrice Precio original
   * @param discount Descuento a aplicar
   * @returns Objeto con parte entera y decimal separadas
   */
  getPriceWithDiscount(originalPrice: number, discount: number): { integerPart: number, decimalPart: string } {
    const priceWithDiscount = originalPrice - discount;
    const integerPart = Math.floor(priceWithDiscount);
    const decimalPart = ((priceWithDiscount - integerPart) * 100).toFixed(0);
    return { integerPart, decimalPart };
  }

  /**
   * Verifica si un producto tiene descuento aplicado
   * @param originalPrice Precio original
   * @param finalPrice Precio final
   * @returns true si tiene descuento
   */
  hasDiscount(originalPrice: number, finalPrice: number): boolean {
    return finalPrice < originalPrice;
  }

  /**
   * Calcula el porcentaje de descuento
   * @param originalPrice Precio original  
   * @param finalPrice Precio final
   * @returns Porcentaje de descuento redondeado
   */
  getDiscountPercentage(originalPrice: number, finalPrice: number): number {
    if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;
    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  }
}