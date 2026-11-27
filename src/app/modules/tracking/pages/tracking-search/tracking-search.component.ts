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
  get isOrderIdValid(): boolean {
    return !!this.orderId.trim() &&
      this.trackingService.validateOrderId(this.orderId.trim());
  }

  get isTokenValid(): boolean {
    return /^[a-fA-F0-9]{32}$/.test(this.trackingToken.trim());
  }

  searchTracking(): void {
    if (this.isSearching) return;
    // Marcar campos como tocados
    this.orderIdTouched = true;
    this.tokenTouched = true;
    
    // Limpiar errores previos
    this.errorMessage = '';

    // Sanitizar y validar Order ID
    this.orderId = this.orderId.trim();
    this.trackingToken = this.trackingToken.trim();

    // Validaciones específicas
    if (!this.orderId) {
      this.errorMessage = 'tracking.search.order_required';
      return;
    }

    if (!this.trackingService.validateOrderId(this.orderId)) {
      this.errorMessage = 'tracking.search.order_invalid';
      return;
    }

    if (!this.trackingToken) {
      this.errorMessage = 'tracking.search.token_required';
      return;
    }

    if (!/^[a-fA-F0-9]{32}$/.test(this.trackingToken)) {
      this.errorMessage = 'tracking.search.token_invalid';
      return;
    }

    this.orderId = this.trackingService.sanitizeOrderId(this.orderId);

    // Todo validado, redirigir
    this.isSearching = true;
    this.router.navigate([
      '/', this.country, this.locale,
      'tracking', this.orderId, this.trackingToken
    ]).then(navigated => {
      if (!navigated) {
        this.errorMessage = 'tracking.search.navigation_error';
      }
    }).catch(() => {
      this.errorMessage = 'tracking.search.navigation_error';
    }).finally(() => {
      this.isSearching = false;
    });
  }

  /**
   * 🎯 Validar número de orden al perder foco
   */
  validateOrderId(): void {
    this.orderIdTouched = true;
    if (this.orderId && !this.trackingService.validateOrderId(this.orderId)) {
      this.errorMessage = 'tracking.search.order_invalid';
    } else if (this.errorMessage.startsWith('tracking.search.order_')) {
      this.errorMessage = '';
    }
  }

  /**
   * 🎯 Validar token al perder foco
   */
  validateToken(): void {
    this.tokenTouched = true;
    const trimmedToken = this.trackingToken.trim();
    if (trimmedToken && !/^[a-fA-F0-9]{32}$/.test(trimmedToken)) {
      this.errorMessage = 'tracking.search.token_invalid';
    } else if (this.errorMessage.startsWith('tracking.search.token_')) {
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
