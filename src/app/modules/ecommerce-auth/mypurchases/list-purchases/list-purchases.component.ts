import { Component, OnDestroy, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';

@Component({
  selector: 'app-list-purchases',
  templateUrl: './list-purchases.component.html',
  styleUrls: ['./list-purchases.component.css']
})
export class ListPurchasesComponent implements OnInit, OnDestroy {

  euro = "€";
  sale_orders:any = [];
  sale_details:any = [];

  pageSize: number = 8; // Número de compras por página (no productos)
  currentPage: number = 1; // Página actual
  paginatedSaleOrders: any[] = []; // Compras paginadas
  paginatedSaleDetails: any[] = []; // Detalles de las compras paginadas (para compatibilidad con template)
  totalPages: number = 0; // Total de páginas

  CURRENT_USER_AUTHENTICATED:any=null;

  subscriptions: Subscription = new Subscription();  // Mantener todas las subscripciones: Subscription = new Subscription();  // Mantener todas las subscripciones

  loading: boolean = false;
  locale: string = "";
  country: string = "";
  
  // Loading state para descarga de recibos
  downloadingReceipts: Set<number> = new Set(); // Track múltiples descargas por saleId

  constructor(
    //private authService: AuthService,
    public _ecommerceAuthService: EcommerceAuthService,
    private router: Router,
    //private cartService: CartService,
    //private activatedRoute: ActivatedRoute,
    private localizationService: LocalizationService,
    private priceCalculationService: PriceCalculationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }
 
  ngOnInit(): void {
    this.subscriptions = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser(); 
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.showSaleDetails();
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
      }
    });
  }

  showSaleDetails() {
    let data = {
      user_id: this.CURRENT_USER_AUTHENTICATED._id,
    };

    this._ecommerceAuthService.showProfileClient(data).subscribe((resp:any) => {
      console.log("Mis compras: ", resp);
      console.log("Estructura de sale_orders[0]:", resp.sale_orders?.[0]);
      console.log("Estructura de sale_details[0]:", resp.sale_orders?.[0]?.sale_details?.[0]);
      // Debug: Examinar campos de descuento disponibles
       if (resp.sale_orders?.[0]?.sale_details?.[0]) {
         const detail = resp.sale_orders[0].sale_details[0];
         console.log("🔍 Campos de descuento disponibles:", {
           code_discount: detail.code_discount,
           discount: detail.discount,
           code_cupon: detail.code_cupon,
           price_unitario: detail.price_unitario,
           type_discount: detail.type_discount,
           product_price_usd: detail.product?.price_usd,
           variedad_retail_price: detail.variedad?.retail_price || detail.variedade?.retail_price
         });
        
      //   // Debug de cálculos de descuento
      //   console.log("🧮 Test de cálculos para el primer producto:", {
      //     hasDiscount: this.hasDiscount(detail),
      //     originalPrice: this.getOriginalPrice(detail),
      //     finalPrice: this.getFinalUnitPrice(detail),
      //     discountPercentage: this.getDiscountPercentage(detail),
      //     discountAmount: this.getDiscountAmount(detail),
      //     discountType: this.getDiscountType(detail)
      //   });
      }
      
      this.sale_orders = resp.sale_orders;
      this.sale_details = [];

      // Recorremos cada objeto en sale_orders
      this.sale_orders.forEach((order: any) => {
        // Verificamos si existe la propiedad sale_details y si es un array
        if (order && order.sale_details && Array.isArray(order.sale_details)) {
          // Añadimos cada detalle de venta a sale_details
          order.sale_details.forEach((detail: any) => {
            this.sale_details.push(detail);
          });
        }
      });

      // Ordenar sale_details por fecha de creación de la venta (más recientes primero)
      this.sale_details.sort((a: any, b: any) => {
        const dateA = new Date(a.sale?.createdAt || a.sale?.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.sale?.createdAt || b.sale?.updatedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // Descendente: más reciente primero
      });

      // Calcular paginación basada en el número de compras (sale_orders), no productos
      this.totalPages = Math.ceil(this.sale_orders.length / this.pageSize);
      this.updatePaginatedDetails();
    });
  }

  // Función para actualizar los detalles paginados - ahora pagina por compras, no por productos
  updatePaginatedDetails(): void {
    // Paginar las compras (sale_orders)
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedSaleOrders = this.sale_orders.slice(start, end);

    // Extraer todos los productos de las compras paginadas (sin limitación de productos por compra)
    this.paginatedSaleDetails = [];
    this.paginatedSaleOrders.forEach((order: any) => {
      if (order && order.sale_details && Array.isArray(order.sale_details)) {
        // Agregar TODOS los productos de esta compra (sin paginación interna)
        order.sale_details.forEach((detail: any) => {
          this.paginatedSaleDetails.push(detail);
        });
      }
    });

    //console.log('Compras paginadas:', this.paginatedSaleOrders.length, 'Total productos mostrados:', this.paginatedSaleDetails.length);
  }

  // Función para cambiar de página
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedDetails();
  }

  // Getter para obtener la fecha de la última compra de forma más precisa
  get lastPurchaseDate(): Date | null {
    if (!this.sale_details || this.sale_details.length === 0) {
      return null;
    }
    
    // Como ya están ordenados, el primer elemento es la compra más reciente
    const lastDetail = this.sale_details[0];
    const dateStr = lastDetail?.sale?.createdAt || lastDetail?.sale?.updatedAt || lastDetail?.createdAt;
    
    return dateStr ? new Date(dateStr) : null;
  }

  // Getter para obtener el total de productos en todas las compras
  get totalProducts(): number {
    return this.sale_details?.length || 0;
  }

  // Getter para obtener el total de compras
  get totalPurchases(): number {
    return this.sale_orders?.length || 0;
  }

  // Método helper para verificar si un recibo específico se está descargando
  isDownloadingReceipt(saleId: number): boolean {
    return this.downloadingReceipts.has(saleId);
  }

  // 📄 ================ MÉTODOS PARA RECIBOS ================ 📄
  
  /**
   * Descargar recibo en PDF para una venta específica
   */
  downloadReceipt(saleId: number): void {
    if (!saleId) {
      console.error('Sale ID es requerido para descargar recibo');
      return;
    }

    // Evitar múltiples descargas simultáneas del mismo recibo
    if (this.downloadingReceipts.has(saleId)) {
      return;
    }

    //console.log(`Descargando recibo para venta ID: ${saleId}`);
    
    // Iniciar loading state
    this.downloadingReceipts.add(saleId);

    // Primero obtener información del recibo
    this._ecommerceAuthService.getReceiptBySale(saleId).subscribe({
      next: (resp: any) => {
        //console.log('Recibo obtenido:', resp);
        
        if (resp && resp.success && resp.receipt) {
          // Si existe el recibo, proceder con la descarga del PDF
          this.downloadReceiptPdf(resp.receipt.id, saleId);
        } else {
          //console.warn('No se encontró recibo para esta venta');
          // Terminar loading state
          this.downloadingReceipts.delete(saleId);
          // Aquí podrías mostrar un mensaje al usuario
        }
      },
      error: (error) => {
        console.error('Error obteniendo recibo:', error);
        // Terminar loading state en caso de error
        this.downloadingReceipts.delete(saleId);
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    });
  }

  /**
   * Descargar PDF del recibo
   */
  private downloadReceiptPdf(receiptId: number, saleId: number): void {
    this._ecommerceAuthService.downloadReceiptPdf(receiptId).subscribe({
      next: (blob: any) => {
        // Crear URL del blob y descargar automáticamente
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-pedido-${saleId}.pdf`;
        
        // Simular click para iniciar descarga
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Recibo descargado: recibo-pedido-${saleId}.pdf`);
        
        // Terminar loading state
        this.downloadingReceipts.delete(saleId);
      },
      error: (error) => {
        console.error('Error descargando PDF del recibo:', error);
        // Terminar loading state en caso de error
        this.downloadingReceipts.delete(saleId);
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    });
  }

  // 💰 ================ MÉTODOS PARA PRECIOS ================ 💰

  /**
   * Obtiene el precio mostrado en la lista con redondeo .95
   * @param prodDetail Detalle del producto de la compra
   * @returns Precio con redondeo .95 aplicado
   */
  getDisplayPrice(prodDetail: any): number {
    if (!prodDetail) return 0;

    // Obtener el precio base del producto
    const basePrice = prodDetail.total || prodDetail.subtotal || prodDetail.price || 0;
    
    // Si el precio es 0 o negativo, devolverlo tal como está
    if (basePrice <= 0) return basePrice;

    // Aplicar redondeo .95 para consistencia con el resto de la plataforma
    //return this.priceCalculationService.applyRoundingTo95(basePrice);
     return parseFloat(basePrice.toFixed(2));
  }

  /**
   * Obtiene el total de la venta SIN redondeo (suma exacta)
   * @param sale Datos de la venta
   * @returns Total exacto como suma de productos individuales
   */
  getSaleTotalPrice(sale: any): number {
    if (!sale) return 0;

    // Obtener el total de la venta tal como está almacenado (suma exacta)
    const totalPrice = sale.total || sale.total_amount || 0;
    
    // ✅ NO aplicar redondeo .95 al total - debe ser suma exacta de productos
    // El redondeo .95 solo se aplica a precios unitarios individuales
    return parseFloat(totalPrice.toString());
  }

  getTotalForDisplay(prodDetail: any): number {
    if (!prodDetail) return 0;
    const unitPrice = parseFloat(prodDetail.price_unitario || 0);
    const quantity = parseInt(prodDetail.cantidad || 1);
    return parseFloat((unitPrice * quantity).toFixed(2)); // total exacto
  }

  // 🏷️ ================ MÉTODOS PARA DESCUENTOS ================ 🏷️

  /**
   * Detecta si un producto tiene descuento aplicado
   * Solo muestra descuento si type_campaign es válido (validado en backend)
   * @param prodDetail Detalle del producto
   * @returns true si tiene descuento real
   */
  hasDiscount(prodDetail: any): boolean {
    if (!prodDetail) return false;
    
    // type_campaign: 1=Campaign, 2=Flash Sale, 3=Cupón
    // Solo mostrar descuento si type_campaign está presente y discount > 0
    return prodDetail.type_campaign && 
           [1, 2, 3].includes(prodDetail.type_campaign) && 
           parseFloat(prodDetail.discount || 0) > 0;
  }

  /**
   * Obtiene el precio original del producto (sin descuentos)
   * @param prodDetail Detalle del producto
   * @returns Precio original
   */
  getOriginalPrice(prodDetail: any): number {
    if (!prodDetail) return 0;
    
    // Usar el mismo orden de prioridad que el sistema de checkout
    const variedad = prodDetail.variedad || prodDetail.variedade;
    const retailPrice = parseFloat(variedad?.retail_price || 0);
    const productPrice = parseFloat(prodDetail.product?.price_usd || 0);
    
    // Priorizar retail_price de variedad, luego price_usd del producto
    return retailPrice > 0 ? retailPrice : productPrice;
  }

  /**
   * Obtiene el precio final unitario (con descuentos aplicados)
   * IMPORTANTE: price_unitario YA viene validado y calculado desde el backend
   * @param prodDetail Detalle del producto
   * @returns Precio final unitario
   */
  getFinalUnitPrice(prodDetail: any): number {
    if (!prodDetail) return 0;
    
    // price_unitario ya viene con el cálculo correcto desde el backend
    const finalPrice = parseFloat(prodDetail.price_unitario || 0);
    
    if (finalPrice > 0) {
      return finalPrice;
    }
    
    // Fallback: usar retail_price si price_unitario no está disponible
    const variedad = prodDetail.variedad || prodDetail.variedade;
    return parseFloat(variedad?.retail_price || prodDetail.product?.price_usd || 0);
  }

  /**
   * Calcula el monto de descuento aplicado
   * @param prodDetail Detalle del producto
   * @returns Monto del descuento
   */
  getDiscountAmount(prodDetail: any): number {
    if (!prodDetail || !this.hasDiscount(prodDetail)) return 0;
    
    const originalPrice = this.getOriginalPrice(prodDetail);
    const finalPrice = this.getFinalUnitPrice(prodDetail);
    
    if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;
    
    return parseFloat((originalPrice - finalPrice).toFixed(2));
  }

  /**
   * Calcula el porcentaje de descuento
   * @param prodDetail Detalle del producto
   * @returns Porcentaje de descuento
   */
  getDiscountPercentage(prodDetail: any): number {
    if (!prodDetail || !this.hasDiscount(prodDetail)) return 0;
    
    // Si type_discount es 1 (porcentual), usar directamente el valor de discount
    if (prodDetail.type_discount === 1 && prodDetail.discount > 0) {
      return Math.round(parseFloat(prodDetail.discount));
    }
    
    // Si type_discount es 2 (fijo), calcular porcentaje
    const originalPrice = this.getOriginalPrice(prodDetail);
    const discountAmount = parseFloat(prodDetail.discount || 0);
    
    if (originalPrice <= 0 || discountAmount <= 0) return 0;
    
    return Math.round((discountAmount / originalPrice) * 100);
  }

  /**
   * Obtiene el tipo de descuento aplicado
   * @param prodDetail Detalle del producto
   * @returns Tipo de descuento como string
   */
  getDiscountType(prodDetail: any): string {
    if (!prodDetail || !this.hasDiscount(prodDetail)) return '';
    
    // Usar type_campaign validado en backend
    // type_campaign: 1=Campaign Discount, 2=Flash Sale, 3=Cupón
    if (prodDetail.type_campaign === 3) {
      return `Cupón ${prodDetail.code_cupon || ''}`;
    } else if (prodDetail.type_campaign === 2) {
      return 'Flash Sale';
    } else if (prodDetail.type_campaign === 1) {
      return 'Campaign Discount';
    }
    
    return '';
  }

  /**
   * Obtiene el precio original con redondeo .95 para mostrar en template
   * @param prodDetail Detalle del producto
   * @returns Precio original con redondeo aplicado
   */
  getOriginalPriceForDisplay(prodDetail: any): number {
    const originalPrice = this.getOriginalPrice(prodDetail);
    return this.priceCalculationService.applyRoundingTo95(originalPrice);
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
  }
}
