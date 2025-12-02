import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { finalize, timeout, retry, catchError, map } from 'rxjs/operators';
import { URL_SERVICE } from 'src/app/config/config';
import { TrackingResponse, TrackingStatus } from '../models/tracking-status.model';

/**
 * 📦 Servicio de Tracking
 * Sigue exactamente la arquitectura del servicio Printful
 * - Llamadas directas a API backend que consulta Printful
 * - Combina datos de Printful + BD local
 * - Manejo robusto de errores
 * - Timeouts y retries
 */
@Injectable({
  providedIn: 'root'
})
export class TrackingService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  // Configuración de timeouts y retries (igual que Printful service)
  private readonly DEFAULT_TIMEOUT = 30000; // 30 segundos
  private readonly MAX_RETRIES = 2; // Reintentar 2 veces

  constructor(
    private _http: HttpClient
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  /**
   * 🔍 Obtener estado de tracking por Order ID + Token
   * - Llama al backend que consulta Printful directamente
   * - Combina datos de Printful + BD local (Sale)
   * - Requiere token de seguridad (trackingToken)
   * 
   * @param orderId - ID de la orden (Sale.id)
   * @param token - Token de seguridad (trackingToken)
   * @returns Observable con el estado completo del tracking
   */
  getTrackingStatus(orderId: string, token: string): Observable<TrackingStatus> {
    this.isLoadingSubject.next(true);
    
    const url = `${URL_SERVICE}/orders/tracking/${orderId}/${token}`;
    
    console.log('🔍 Consultando tracking para orden:', orderId, 'con token:', token.substring(0, 8) + '...');

    return this._http.get<TrackingResponse>(url).pipe(
      timeout(this.DEFAULT_TIMEOUT),
      retry(this.MAX_RETRIES),
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'No se pudo obtener el estado del pedido');
        }
        
        console.log('✅ Tracking obtenido:', response.data);
        return response.data;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo tracking:', error);
        
        // Manejar diferentes tipos de errores
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            message: 'La consulta tardó demasiado tiempo. Por favor, intenta de nuevo.',
            error: error
          }));
        }
        
        if (error.status === 0) {
          return throwError(() => ({
            message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
            error: error
          }));
        }
        
        if (error.status === 404) {
          return throwError(() => ({
            message: 'Orden no encontrada. Verifica el número de orden.',
            error: error
          }));
        }
        
        if (error.status === 400) {
          return throwError(() => ({
            message: 'Número de orden inválido.',
            error: error
          }));
        }
        
        // Error genérico
        return throwError(() => ({
          message: error.error?.message || 'Error al consultar el tracking',
          error: error
        }));
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
        console.log('🏁 Consulta de tracking finalizada');
      })
    );
  }

  /**
   * 🔄 Validar formato de Order ID
   * Los Order IDs de Printful son números, o pueden ser external_id (nuestro Sale.id)
   * 
   * @param orderId - ID a validar
   * @returns true si el formato es válido
   */
  validateOrderId(orderId: string): boolean {
    if (!orderId || orderId.trim() === '') {
      return false;
    }

    // Permitir números (Printful ID) o alfanuméricos (external_id)
    const orderIdPattern = /^[a-zA-Z0-9\-_]+$/;
    return orderIdPattern.test(orderId.trim());
  }

  /**
   * 🧹 Limpiar Order ID
   * Acepta formatos: 9, 135327909, #PF135327909, PF135327909
   * Prioridad: Printful ID → Sale ID interno
   * 
   * @param orderId - ID a limpiar
   * @returns Order ID limpio (sin #PF)
   */
  sanitizeOrderId(orderId: string): string {
    // Remover #PF o PF del inicio (case insensitive) y dejar solo números
    return orderId.trim().replace(/^#?PF/i, '').replace(/[^0-9]/g, '');
  }

  /**
   * 📊 Calcular progreso visual basado en estado de Printful
   * Igual que en el módulo Printful - mapeo de estados a porcentaje
   * 
   * @param status - Estado de Printful
   * @returns Porcentaje de progreso (0-100)
   */
  calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'draft': 0,
      'pending': 10,
      'failed': 0,
      'canceled': 0,
      'onhold': 20,
      'inprocess': 50,
      'partial': 75,
      'fulfilled': 100,
      'archived': 100
    };

    return progressMap[status.toLowerCase()] || 0;
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado
   * 
   * @param status - Estado de Printful
   * @returns Clase CSS del badge
   */
  getStatusBadgeClass(status: string): string {
    const badgeMap: Record<string, string> = {
      'draft': 'badge-secondary',
      'pending': 'badge-warning',
      'failed': 'badge-danger',
      'canceled': 'badge-danger',
      'onhold': 'badge-info',
      'inprocess': 'badge-primary',
      'partial': 'badge-info',
      'fulfilled': 'badge-success',
      'archived': 'badge-secondary'
    };

    return badgeMap[status.toLowerCase()] || 'badge-secondary';
  }

  /**
   * 📝 Obtener texto en español para estado
   * 
   * @param status - Estado de Printful
   * @returns Texto en español
   */
  getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'draft': 'Borrador',
      'pending': 'Pendiente',
      'failed': 'Fallido',
      'canceled': 'Cancelado',
      'onhold': 'En espera',
      'inprocess': 'Fabricando',
      'partial': 'Parcial',
      'fulfilled': 'Entregado',
      'archived': 'Archivado'
    };

    return textMap[status.toLowerCase()] || status;
  }
}
