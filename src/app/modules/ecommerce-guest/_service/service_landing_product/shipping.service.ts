import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class ShippingService {

  // Estados reactivos para el manejo de envío
  private shippingRateSubject = new BehaviorSubject<any>(null);
  public shippingRate$ = this.shippingRateSubject.asObservable();

  private selectedShippingMethodSubject = new BehaviorSubject<any>(null);
  public selectedShippingMethod$ = this.selectedShippingMethodSubject.asObservable();

  private shippingCostSubject = new BehaviorSubject<number>(0);
  public shippingCost$ = this.shippingCostSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Carga las tarifas de envío para una dirección específica
   */
  loadShippingRateWithAddress(address: any, isFallback: boolean = false): Observable<any> {
    if (!address) {
      throw new Error('Dirección requerida para calcular tarifa de envío');
    }

    this.loadingSubject.next(true);

    // Construir el payload como lo hacen los otros componentes
    const payload = {
      recipient: {
        address1: address.address,
        city: address.ciudad,
        country_code: 'ES', // Por defecto España
        zip: address.zipcode || '28001',
      },
      items: [
        {
          quantity: 1,
          variant_id: 1 // Valor por defecto para landing-product
        }
      ],
      currency: 'EUR',
      locale: 'es_ES'
    };

    let URL = `${URL_SERVICE}shipping/rates`;
    
    return this.http.post(URL, payload).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Actualiza la tarifa de envío actual
   */
  updateShippingRate(rate: any): void {
    this.shippingRateSubject.next(rate);
    if (rate && rate.price) {
      this.shippingCostSubject.next(rate.price);
    }
  }

  /**
   * Obtiene la tarifa de envío actual
   */
  getCurrentShippingRate(): any {
    return this.shippingRateSubject.value;
  }

  /**
   * Obtiene el costo de envío actual
   */
  getCurrentShippingCost(): number {
    return this.shippingCostSubject.value || 0;
  }

  /**
   * Selecciona un método de envío
   */
  selectShippingMethod(method: any): void {
    this.selectedShippingMethodSubject.next(method);
    if (method && method.price) {
      this.shippingCostSubject.next(method.price);
    }
  }

  /**
   * Obtiene el método de envío seleccionado
   */
  getSelectedShippingMethod(): any {
    return this.selectedShippingMethodSubject.value;
  }

  /**
   * Calcula el costo total de envío basado en el peso y destino
   */
  calculateShippingCost(weight: number, destination: any, shippingMethod: any): number {
    if (!shippingMethod || !shippingMethod.price) return 0;

    let baseCost = shippingMethod.price;

    // Aplicar recargos por peso si es necesario
    if (weight > shippingMethod.max_weight) {
      const extraWeight = weight - shippingMethod.max_weight;
      const extraCost = Math.ceil(extraWeight / shippingMethod.weight_increment) * shippingMethod.extra_cost;
      baseCost += extraCost;
    }

    // Aplicar recargos por zona remota si aplica
    if (destination.is_remote && shippingMethod.remote_surcharge) {
      baseCost += shippingMethod.remote_surcharge;
    }

    return baseCost;
  }

  /**
   * Valida si el envío está disponible para una dirección
   */
  validateShippingAvailability(address: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}shippingrates/validate`;
    
    return this.http.post(URL, { address }).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Obtiene los métodos de envío disponibles
   */
  getAvailableShippingMethods(address: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}shippingrates/methods`;
    
    return this.http.post(URL, { address }).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Estima el tiempo de entrega
   */
  estimateDeliveryTime(shippingMethod: any, destination: any): string {
    if (!shippingMethod) return 'No disponible';

    const baseTime = shippingMethod.delivery_time || 3;
    let estimatedTime = baseTime;

    // Añadir tiempo extra para zonas remotas
    if (destination.is_remote) {
      estimatedTime += 2;
    }

    // Formatear respuesta
    if (estimatedTime <= 1) {
      return '1 día hábil';
    } else if (estimatedTime <= 7) {
      return `${estimatedTime} días hábiles`;
    } else {
      const weeks = Math.ceil(estimatedTime / 7);
      return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
  }

  /**
   * Rastrea un envío
   */
  trackShipment(trackingNumber: string): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}shipping/track/${trackingNumber}`;
    
    return this.http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Confirma un envío
   */
  confirmShipment(shipmentData: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}shipping/confirm`;
    
    return this.http.post(URL, shipmentData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Cancela un envío
   */
  cancelShipment(shipmentId: number): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}shipping/cancel/${shipmentId}`;
    
    return this.http.post(URL, {}).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Calcula el peso total de los productos
   */
  calculateTotalWeight(products: any[]): number {
    if (!products || products.length === 0) return 0;

    return products.reduce((total, product) => {
      const weight = product.weight || 0.1; // Peso por defecto si no está especificado
      const quantity = product.quantity || 1;
      return total + (weight * quantity);
    }, 0);
  }

  /**
   * Verifica si el envío es gratuito
   */
  isFreeShipping(cartTotal: number, shippingMethod: any): boolean {
    if (!shippingMethod) return false;
    
    return shippingMethod.free_shipping_threshold && 
           cartTotal >= shippingMethod.free_shipping_threshold;
  }

  /**
   * Resetea todos los estados del servicio
   */
  resetStates(): void {
    this.shippingRateSubject.next(null);
    this.selectedShippingMethodSubject.next(null);
    this.shippingCostSubject.next(0);
  }
}