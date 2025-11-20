import { Component, OnDestroy, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { LocalizationService } from 'src/app/services/localization.service';

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

  constructor(
    //private authService: AuthService,
    public _ecommerceAuthService: EcommerceAuthService,
    private router: Router,
    //private cartService: CartService,
    //private activatedRoute: ActivatedRoute,
    private localizationService: LocalizationService
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

    console.log('Compras paginadas:', this.paginatedSaleOrders.length, 'Total productos mostrados:', this.paginatedSaleDetails.length);
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

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
  }
}
