import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
export class TrackingSearchComponent implements OnInit, OnDestroy {

  accessMode: 'email' | 'token' = 'email';

  recoveryOrderId = '';
  recoveryEmail = '';
  recoveryOrderTouched = false;
  recoveryEmailTouched = false;
  recoveryMessage = '';
  recoveryAccepted = false;
  isRecovering = false;

  private subscriptions = new Subscription();

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
    if (this.route.parent) {
      this.subscriptions.add(
        this.route.parent.params.subscribe(params => {
          this.country = params['country'] || 'es';
          this.locale = params['locale'] || 'es';
        })
      );
    }
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


  get isRecoveryOrderValid(): boolean {
    const id = this.recoveryOrderId.trim().replace(/^#/, '');

    return /^[1-9][0-9]{0,9}$/.test(id) &&
      Number(id) <= 2147483647;
  }

  get isRecoveryEmailValid(): boolean {
    const email = this.recoveryEmail.trim();

    return email.length <= 254 &&
      /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email);
  }

  switchAccessMode(): void {
    if (this.isRecovering || this.isSearching) return;

    this.accessMode =
      this.accessMode === 'email' ? 'token' : 'email';

    this.errorMessage = '';
    this.recoveryMessage = '';
    this.recoveryAccepted = false;
    this.recoveryOrderTouched = false;
    this.recoveryEmailTouched = false;
    this.orderIdTouched = false;
    this.tokenTouched = false;
  }

  clearRecoveryMessage(): void {
    this.recoveryMessage = '';
    this.recoveryAccepted = false;
  }

  recoverTracking(): void {
    if (this.isRecovering || this.recoveryAccepted) return;

    this.recoveryOrderTouched = true;
    this.recoveryEmailTouched = true;
    this.clearRecoveryMessage();

    if (!this.isRecoveryOrderValid ||
        !this.isRecoveryEmailValid) {
      return;
    }

    this.isRecovering = true;

    this.subscriptions.add(
      this.trackingService.recoverOrder(
        this.recoveryOrderId,
        this.recoveryEmail
      ).pipe(
        finalize(() => {
          this.isRecovering = false;
        })
      ).subscribe({
        next: response => {
          if (response?.success === true) {
            this.recoveryAccepted = true;
            this.recoveryMessage = 'tracking.recovery.accepted';
          } else {
            this.recoveryMessage = 'tracking.recovery.error';
          }
        },
        error: error => {
          switch (error.status) {
            case 429:
              this.recoveryMessage = 'tracking.recovery.rate_limit';
              break;
            case 503:
              this.recoveryMessage = 'tracking.recovery.unavailable';
              break;
            default:
              this.recoveryMessage = 'tracking.recovery.error';
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
