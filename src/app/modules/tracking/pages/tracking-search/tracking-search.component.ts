import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TrackingService } from '../../services/tracking.service';

/**
 * 🔍 Componente de búsqueda de tracking
 * Página pública donde usuarios/guests pueden buscar sus pedidos
 * Similar a la búsqueda de Amazon/FedEx/UPS
 */
@Component({
  selector: 'app-tracking-search',
  templateUrl: './tracking-search.component.html',
  styleUrls: ['./tracking-search.component.scss']
})
export class TrackingSearchComponent implements OnInit {

  orderId: string = '';
  trackingToken: string = '';
  errorMessage: string = '';
  isSearching: boolean = false;
  
  // Validación individual de campos
  orderIdTouched: boolean = false;
  tokenTouched: boolean = false;
  
  // Parámetros de ruta
  country: string = 'es';
  locale: string = 'es';

  constructor(
    private trackingService: TrackingService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Limpiar cualquier error previo
    this.errorMessage = '';
    
    // Obtener country y locale de la ruta
    this.route.parent?.params.subscribe(params => {
      this.country = params['country'] || 'es';
      this.locale = params['locale'] || 'es';
    });
  }

  /**
   * 🔍 Buscar estado del pedido
   * Valida el Order ID y token, luego redirige a la página de estado
   */
  searchTracking(): void {
    // Marcar campos como tocados
    this.orderIdTouched = true;
    this.tokenTouched = true;
    
    // Limpiar errores previos
    this.errorMessage = '';

    // Sanitizar y validar Order ID
    this.orderId = this.trackingService.sanitizeOrderId(this.orderId);
    this.trackingToken = this.trackingToken.trim();

    // Validaciones específicas
    if (!this.orderId) {
      this.errorMessage = '⚠️ Por favor ingresa un número de orden';
      return;
    }

    if (!this.trackingService.validateOrderId(this.orderId)) {
      this.errorMessage = '⚠️ El número de orden no es válido. Usa el formato: #PF135327909 o 135327909';
      return;
    }

    if (!this.trackingToken) {
      this.errorMessage = '⚠️ Por favor ingresa el token de seguimiento';
      return;
    }

    if (this.trackingToken.length !== 32) {
      this.errorMessage = `⚠️ El token debe tener exactamente 32 caracteres (actualmente: ${this.trackingToken.length})`;
      return;
    }

    // Todo validado, redirigir
    this.isSearching = true;
    this.router.navigate(['/', this.country, this.locale, 'tracking', this.orderId, this.trackingToken]);
  }

  /**
   * 🎯 Validar número de orden al perder foco
   */
  validateOrderId(): void {
    this.orderIdTouched = true;
    if (this.orderId && !this.trackingService.validateOrderId(this.trackingService.sanitizeOrderId(this.orderId))) {
      this.errorMessage = '⚠️ Formato de orden inválido. Usa: #PF135327909 o 135327909';
    } else if (this.errorMessage.includes('orden')) {
      this.errorMessage = '';
    }
  }

  /**
   * 🎯 Validar token al perder foco
   */
  validateToken(): void {
    this.tokenTouched = true;
    const trimmedToken = this.trackingToken.trim();
    if (trimmedToken && trimmedToken.length !== 32) {
      this.errorMessage = `⚠️ El token debe tener 32 caracteres (actualmente: ${trimmedToken.length})`;
    } else if (this.errorMessage.includes('token')) {
      this.errorMessage = '';
    }
  }

  /**
   * 🧹 Limpiar error al escribir
   */
  clearError(): void {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  /**
   * ⌨️ Manejar Enter key en input
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchTracking();
    }
  }

  /**
   * 🧹 Limpiar campo de búsqueda
   */
  clearSearch(): void {
    this.orderId = '';
    this.trackingToken = '';
    this.errorMessage = '';
  }
}
