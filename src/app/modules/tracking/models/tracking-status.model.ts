/**
 * 📦 Modelo de estado de tracking
 * Combina datos de Printful API + Base de datos local
 */
export interface TrackingStatus {
  // Identificadores
  orderId: string;              // ID de Printful
  externalId: string;           // ID de tu Sale en BD
  
  // Estado del pedido
  status: PrintfulOrderStatus;
  progress: number;             // 0-100 para barra de progreso
  
  // Items del pedido (desde Printful)
  items: TrackingItem[];
  
  // Información de envío
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  
  // Fechas estimadas (desde BD local)
  estimated: {
    min: string | null;         // Fecha mínima estimada
    max: string | null;         // Fecha máxima estimada
  };
  
  // Fechas reales (desde Printful)
  dates: {
    created: string;            // Fecha de creación
    updated: string;            // Última actualización
    shipped: string | null;     // Fecha de envío
    delivered: string | null;   // Fecha de entrega
  };
  
  // Estados de Printful (raw data)
  printfulStatus: string;
  
  // Timeline de eventos
  timeline: TrackingEvent[];
}

/**
 * Estados posibles de Printful
 */
export type PrintfulOrderStatus = 
  | 'draft'           // Borrador
  | 'pending'         // Pendiente de pago
  | 'failed'          // Falló el pago o proceso
  | 'canceled'        // Cancelado
  | 'onhold'          // En espera
  | 'inprocess'       // En proceso de fabricación
  | 'partial'         // Parcialmente completado
  | 'shipped'
  | 'fulfilled'       // Completado y enviado
  | 'archived';       // Archivado

/**
 * Item del pedido
 */
export interface TrackingItem {
  id: number;
  external_id: string;
  variant_id: number;
  sync_variant_id: number;
  quantity: number;
  name: string;
  retail_price: string;
  files: TrackingFile[];
  options: any[];
  sku: string | null;
  product?: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
}

/**
 * Archivo asociado al item (imagen de producto)
 */
export interface TrackingFile {
  id: number;
  type: string;
  hash: string | null;
  url: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  dpi: number | null;
  status: string;
  created: number;
  thumbnail_url: string | null;
  preview_url: string | null;
  visible: boolean;
}

/**
 * Evento en el timeline del pedido
 */
export interface TrackingEvent {
  type: TrackingEventType;
  status: string;
  title: string;
  description: string;
  date: string | null;
  completed: boolean;
}

/**
 * Tipos de eventos en timeline
 */
export type TrackingEventType = 
  | 'order_received'    // Pedido recibido
  | 'processing'        // Procesando pago
  | 'manufacturing'     // Fabricando producto
  | 'shipped'           // Enviado
  | 'delivered';        // Entregado

/**
 * Respuesta del endpoint de tracking
 */
export interface TrackingResponse {
  success: boolean;
  message?: string;
  data?: TrackingStatus;
  error?: string;
}

/**
 * Mapeo de estados Printful a progreso visual (0-100)
 */
export const TRACKING_PROGRESS_MAP: Record<PrintfulOrderStatus, number> = {
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

/**
 * Mapeo de estados Printful a textos en español
 */
export const TRACKING_STATUS_TEXT: Record<PrintfulOrderStatus, string> = {
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

/**
 * Mapeo de estados Printful a clases CSS de badges
 */
export const TRACKING_STATUS_BADGE: Record<PrintfulOrderStatus, string> = {
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
