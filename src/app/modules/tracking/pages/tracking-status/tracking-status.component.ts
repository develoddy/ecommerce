import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { TrackingService } from '../../services/tracking.service';
import { TrackingStatus, TrackingEvent } from '../../models/tracking-status.model';

/**
 * 📦 Componente de visualización de estado de tracking
 * Página pública que muestra el estado completo del pedido
 * Diseño estilo Amazon con barra de progreso y timeline
 */
@Component({
  selector: 'app-tracking-status',
  templateUrl: './tracking-status.component.html',
  styleUrls: ['./tracking-status.component.scss']
})
export class TrackingStatusComponent implements OnInit, OnDestroy {

  // Data
  orderId: string = '';
  token: string = '';
  trackingData: TrackingStatus | null = null;

  // Estados
  isLoading: boolean = false;
  error: string = '';

  // Timeline de eventos (estilo Amazon)
  timeline: TrackingEvent[] = [];

  // Route params
  country: string = 'es';
  locale: string = 'es';

  // Cleanup
  private destroy$ = new Subject<void>();
  private trackingRequest?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: TrackingService
  ) { }

  ngOnInit(): void {
    // Obtener country y locale del parent route
    this.route.parent?.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
      this.country = params['country'] || 'es';
      this.locale = params['locale'] || 'es';
    });

    // Obtener Order ID y Token de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['orderId'];
        this.token = params['token'];

        if (this.orderId && this.token) {
          this.loadTrackingData();
        } else {
          // Si falta orderId o token, redirigir a búsqueda
          this.router.navigate(['/', this.country, this.locale, 'tracking']);
        }
      });
  }

  ngOnDestroy(): void {
    this.trackingRequest?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🔄 Cargar datos de tracking desde el backend
   */
  loadTrackingData(): void {
    this.trackingRequest?.unsubscribe();

    this.isLoading = true;
    this.error = '';
    this.trackingData = null;
    this.timeline = [];

    this.trackingRequest = this.trackingService
      .getTrackingStatus(this.orderId, this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trackingData = data;
          this.timeline = data.timeline || [];
          this.isLoading = false;

        },
        error: (error) => {
          this.error = 'tracking.status.error_description';
          this.isLoading = false;
          console.error('Error cargando el estado del pedido');
        }
      });
  }

  /**
   * 🔄 Refrescar datos de tracking
   */
  refreshTracking(): void {
    if (this.isLoading) return;
    this.loadTrackingData();
  }

  /**
   * 🔙 Volver a búsqueda
   */
  goBack(): void {
    this.router.navigate(['/', this.country, this.locale, 'tracking']);
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado
   */
  getStatusBadgeClass(): string {
    if (!this.trackingData) return 'badge-secondary';
    return this.trackingService.getStatusBadgeClass(this.trackingData.status);
  }

  /**
   * 📝 Obtener texto en español para estado
   */
  get commercialStatusKey(): string {
    const status = this.trackingData?.commercialStatus;

    switch (status) {
      case 'pending_confirmation':
      case 'confirmed':
      case 'production':
      case 'partially_shipped':
      case 'shipped':
      case 'delivered':
        return 'tracking.status.states.' + status;
      default:
        return 'tracking.status.states.unknown';
    }
  }

  get commercialExceptions(): string[] {
    const exceptions = this.trackingData?.exceptions;

    if (!Array.isArray(exceptions)) return [];

    const allowed = [
      'returned', 'failed', 'canceled', 'onhold'
    ];

    return Array.from(new Set(
      exceptions.map(exception =>
        allowed.includes(exception) ? exception : 'unknown'
      )
    ));
  }

  trackTimelineEvent(
    _index: number,
    event: TrackingEvent
  ): string {
    return event.type;
  }

  getCommercialTimeline(): TrackingEvent[] {
    const stages: {
      type: TrackingEvent['type'];
      key: string;
    }[] = [
      { type: 'order_received', key: 'confirmed' },
      { type: 'manufacturing', key: 'production' },
      { type: 'shipped', key: 'shipped' },
      { type: 'delivered', key: 'delivered' }
    ];

    return stages.map(stage => {
      const event = this.timeline.find(
        item => item.type === stage.type
      );

      return {
        type: stage.type,
        title: 'tracking.status.timeline.' + stage.key,
        description: '',
        completed: event?.completed === true,
        status: event?.completed === true
          ? 'completed'
          : event?.status === 'processing'
            ? 'processing'
            : 'pending',
        date: event?.completed === true
          ? event.date
          : null
      };
    });
  }

  getStatusText(): string {
    if (!this.trackingData) return '';
    if (this.timeline.some(event =>
      event.type === 'delivered' && event.completed
    )) {
      return 'Entregado';
    }

    return this.trackingService.getStatusText(this.trackingData.status);
  }

  /**
   * 🔗 Abrir tracking URL del carrier en nueva pestaña
   */
  get hasTrackingUrl(): boolean {
    try {
      const value = this.trackingData?.trackingUrl;
      if (!value) return false;

      const url = new URL(value);

      return url.protocol === 'https:' ||
        url.protocol === 'http:';
    } catch {
      return false;
    }
  }

  openTrackingUrl(): void {
    if (this.trackingData?.trackingUrl) {
      try {
        const url = new URL(this.trackingData.trackingUrl);

        if (url.protocol === 'https:' || url.protocol === 'http:') {
          window.open(url.href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        return;
      }
    }
  }

  /**
   * 💰 Calcular total del pedido
   */
  getTotalPrice(): number {
    if (!this.trackingData?.items) return 0;
    return this.trackingData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.retail_price) * item.quantity);
    }, 0);
  }

  /**
   * 📦 Obtener total de items (sumando cantidades)
   */
  getTotalItems(): number {
    if (!this.trackingData?.items) return 0;
    return this.trackingData.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * 📊 Obtener porcentaje de progreso
   */
  getProgressPercentage(): number {
    if (!this.trackingData) return 0;
    return this.trackingData.progress || 0;
  }

  /**
   * 🎨 Obtener clase CSS para paso del timeline
   */
  getTimelineStepClass(event: TrackingEvent): string {
    if (event.completed) return 'completed';
    if (event.status === 'processing') return 'active';
    return 'pending';
  }

  /**
   * 📅 Formatear fecha
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(
      this.locale === 'es' ? 'es-ES' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * 💶 Formatear precio en euros
   */
  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice);
  }

  /**
   * 🖼️ Obtener imagen de preview del producto
   */
  getItemImage(item: any): string {
    // 🎯 Lógica idéntica a successfull-checkout para consistencia visual
    // Priorizar mockup con diseño aplicado (preview) sobre producto genérico

    // 1️⃣ Buscar en variedade.files (mockups con diseño aplicado)
    if (item.variedade && Array.isArray(item.variedade.files) && item.variedade.files.length > 0) {
      // Preview primero (mockup con diseño)
      const previewFile = item.variedade.files.find((f: any) => f.type === 'preview');
      if (previewFile && previewFile.preview_url) return previewFile.preview_url;

      // Default como segunda opción
      const defaultFile = item.variedade.files.find((f: any) => f.type === 'default');
      if (defaultFile && defaultFile.preview_url) return defaultFile.preview_url;

      // Cualquier archivo disponible como tercera opción
      const anyFile = item.variedade.files[0];
      if (anyFile) return anyFile.preview_url || anyFile.thumbnail_url || anyFile.url || '';
    }

    // 2️⃣ Fallback a files directamente (compatibilidad con respuesta de Printful)
    if (item.files && item.files.length > 0) {
      const previewFile = item.files.find((f: any) => f.type === 'preview');
      if (previewFile?.preview_url) return previewFile.preview_url;

      const anyFile = item.files.find((f: any) => f.thumbnail_url || f.preview_url || f.url);
      if (anyFile) return anyFile.thumbnail_url || anyFile.preview_url || anyFile.url;
    }

    // 3️⃣ Fallback final al producto genérico
    return item.product?.imagen || item.product?.portada || 'assets/images/placeholder.png';
  }
}
