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
      this.errorMessage = 'Introduce el número de pedido.';
      return;
    }

    if (!this.trackingService.validateOrderId(this.orderId)) {
      this.errorMessage = 'El número de pedido no es válido.';
      return;
    }

    if (!this.trackingToken) {
      this.errorMessage = 'Introduce el código de acceso.';
      return;
    }

    if (!/^[a-fA-F0-9]{32}$/.test(this.trackingToken)) {
      this.errorMessage = 'El código de acceso no es válido. Comprueba el código recibido por correo.';
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
        this.errorMessage = 'No se pudo consultar el pedido. Inténtalo de nuevo.';
      }
    }).catch(() => {
      this.errorMessage = 'No se pudo consultar el pedido. Inténtalo de nuevo.';
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
      this.errorMessage = 'El número de pedido no es válido.';
    } else if (this.errorMessage.includes('pedido')) {
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
      this.errorMessage = 'El código de acceso no es válido.';
    } else if (this.errorMessage.includes('código de acceso')) {
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
