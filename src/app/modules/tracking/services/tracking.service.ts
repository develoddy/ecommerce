import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { finalize, timeout, catchError, map } from 'rxjs/operators';
import { URL_SERVICE } from 'src/app/config/config';
import { TrackingResponse, TrackingStatus } from '../models/tracking-status.model';

/**
 * 📦 Servicio de Tracking
 * Sigue exactamente la arquitectura del servicio Printful
 * - Llamadas directas a API backend que consulta Printful
 * - Combina datos de Printful + BD local
 * - Manejo robusto de errores
 * - Timeout sin reintentos automáticos
 */
@Injectable({
  providedIn: 'root'
})
export class TrackingService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  // Timeout de consultas públicas
  private readonly DEFAULT_TIMEOUT = 30000; // 30 segundos

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
    const normalizedOrderId = this.sanitizeOrderId(orderId);

    if (
      !this.validateOrderId(orderId) ||
      !/^[a-fA-F0-9]{32}$/.test(token)
    ) {
      return throwError(() => ({
        message: 'Verifica el número de pedido y el código de acceso.'
      }));
    }

    this.isLoadingSubject.next(true);
    
    const url = `${URL_SERVICE}orders/tracking/${encodeURIComponent(normalizedOrderId)}/${encodeURIComponent(token)}`;


    return this._http.get<TrackingResponse>(url).pipe(
      timeout(this.DEFAULT_TIMEOUT),
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'No se pudo obtener el estado del pedido');
        }
    
        return response.data;
      }),
      catchError(error => {
        console.error('Error obteniendo el estado del pedido');
        
        // Manejar diferentes tipos de errores
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            message: 'La consulta tardó demasiado tiempo. Por favor, intenta de nuevo.'
          }));
        }
        
        if (error.status === 0) {
          return throwError(() => ({
            message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
          }));
        }
        
        if (error.status === 404) {
          return throwError(() => ({
            message: 'Verifica el número de pedido y el código de acceso.'
          }));
        }
        
        if (error.status === 400) {
          return throwError(() => ({
            message: 'Verifica el número de pedido y el código de acceso.'
          }));
        }
        
        if (error.status === 429) {
          return throwError(() => ({
            message: 'Demasiadas consultas. Espera unos minutos antes de volver a intentarlo.'
          }));
        }

        // Error genérico
        return throwError(() => ({
          message: 'No se pudo consultar el estado del pedido. Inténtalo más tarde.'
        }));
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
        
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

    // Identificadores numéricos con prefijo PF opcional
    const orderIdPattern = /^(?:#?PF)?[0-9]{1,20}$/i;
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
    // Normalizar únicamente identificadores válidos
    return this.validateOrderId(orderId)
      ? orderId.trim().replace(/^#?PF/i, '')
      : '';
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
      'shipped': 75,
      'fulfilled': 75,
      'archived': 0
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
      'shipped': 'badge-success',
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
      'shipped': 'Enviado',
      'fulfilled': 'Enviado',
      'archived': 'Archivado'
    };

    return textMap[status.toLowerCase()] || status;
  }
}
