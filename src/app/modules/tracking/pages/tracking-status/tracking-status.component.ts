import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TrackingService } from '../../services/tracking.service';
import { TrackingStatus, TrackingEvent, TRACKING_PROGRESS_MAP } from '../../models/tracking-status.model';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: TrackingService
  ) { }

  ngOnInit(): void {
    // Obtener country y locale del parent route
    this.route.parent?.params.subscribe(params => {
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🔄 Cargar datos de tracking desde el backend
   */
  loadTrackingData(): void {
    this.isLoading = true;
    this.error = '';

    this.trackingService.getTrackingStatus(this.orderId, this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trackingData = data;
          this.timeline = data.timeline || this.generateTimeline(data);
          this.isLoading = false;
          console.log('✅ Tracking data loaded:', data);
        },
        error: (error) => {
          this.error = error.message || 'Error al cargar el estado del pedido';
          this.isLoading = false;
          console.error('❌ Error loading tracking:', error);
        }
      });
  }

  /**
   * 🔄 Refrescar datos de tracking
   */
  refreshTracking(): void {
    this.loadTrackingData();
  }

  /**
   * 🔙 Volver a búsqueda
   */
  goBack(): void {
    this.router.navigate(['/', this.country, this.locale, 'tracking']);
  }

  /**
   * 📝 Generar timeline de eventos basado en estado de Printful
   */
  private generateTimeline(data: TrackingStatus): TrackingEvent[] {
    const events: TrackingEvent[] = [
      {
        type: 'order_received',
        status: 'completed',
        title: 'Pedido Recibido',
        description: 'Tu pedido ha sido recibido y confirmado',
        date: data.dates.created,
        completed: true
      },
      {
        type: 'processing',
        status: this.getEventStatus(data.status, 'processing'),
        title: 'Procesando',
        description: 'Validando pago y preparando orden',
        date: data.dates.created,
        completed: ['inprocess', 'partial', 'fulfilled'].includes(data.status)
      },
      {
        type: 'manufacturing',
        status: this.getEventStatus(data.status, 'manufacturing'),
        title: 'Fabricando',
        description: 'Tu producto está siendo fabricado',
        date: data.dates.updated,
        completed: ['partial', 'fulfilled'].includes(data.status)
      },
      {
        type: 'shipped',
        status: this.getEventStatus(data.status, 'shipped'),
        title: 'Enviado',
        description: data.trackingNumber 
          ? `En tránsito - ${data.carrier || 'Carrier'}: ${data.trackingNumber}`
          : 'Tu pedido está en camino',
        date: data.dates.shipped || '',
        completed: data.status === 'fulfilled' || !!data.trackingNumber
      },
      {
        type: 'delivered',
        status: this.getEventStatus(data.status, 'delivered'),
        title: 'Entregado',
        description: data.dates.delivered 
          ? 'Tu pedido ha sido entregado'
          : 'Esperando entrega',
        date: data.dates.delivered || data.estimated.max || '',
        completed: data.status === 'fulfilled' && !!data.dates.delivered
      }
    ];

    return events;
  }

  /**
   * 🎯 Determinar estado de un evento en el timeline
   */
  private getEventStatus(orderStatus: string, eventType: string): string {
    const statusFlow = ['pending', 'onhold', 'inprocess', 'partial', 'fulfilled'];
    const eventFlow = ['order_received', 'processing', 'manufacturing', 'shipped', 'delivered'];
    
    const orderIndex = statusFlow.indexOf(orderStatus);
    const eventIndex = eventFlow.indexOf(eventType);
    
    if (orderIndex < 0 || eventIndex < 0) return 'pending';
    if (orderIndex >= eventIndex) return 'completed';
    return 'pending';
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
  getStatusText(): string {
    if (!this.trackingData) return '';
    return this.trackingService.getStatusText(this.trackingData.status);
  }

  /**
   * 🔗 Abrir tracking URL del carrier en nueva pestaña
   */
  openTrackingUrl(): void {
    if (this.trackingData?.trackingUrl) {
      window.open(this.trackingData.trackingUrl, '_blank');
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
    return TRACKING_PROGRESS_MAP[this.trackingData.status] || 0;
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
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
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
    // Prioridad: preview > thumbnail > placeholder
    if (item.files && item.files.length > 0) {
      // Buscar imagen de tipo 'preview' primero
      const previewFile = item.files.find((f: any) => f.type === 'preview');
      if (previewFile?.preview_url) {
        return previewFile.preview_url;
      }
      
      // Fallback a thumbnail o cualquier imagen disponible
      const anyFile = item.files.find((f: any) => f.thumbnail_url || f.preview_url || f.url);
      if (anyFile) {
        return anyFile.thumbnail_url || anyFile.preview_url || anyFile.url;
      }
    }
    
    // Fallback a imagen del producto si existe
    if (item.product?.image) {
      return item.product.image;
    }
    
    // Placeholder final
    return 'assets/images/placeholder.png';
  }
}
