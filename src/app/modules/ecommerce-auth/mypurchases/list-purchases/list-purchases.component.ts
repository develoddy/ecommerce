import { Component, OnDestroy, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-list-purchases',
  templateUrl: './list-purchases.component.html',
  styleUrls: ['./list-purchases.component.css']
})
export class ListPurchasesComponent implements OnInit, OnDestroy {

  euro = "€";
  sale_orders:any = [];
  sale_details:any = [];

  pageSize: number = 5; // Número de elementos por página
  currentPage: number = 1; // Página actual
  paginatedSaleDetails: any[] = []; // Detalles paginados
  totalPages: number = 0; // Total de páginas

  CURRENT_USER_AUTHENTICATED:any=null;

  subscriptions: Subscription = new Subscription();  // Mantener todas las subscripciones: Subscription = new Subscription();  // Mantener todas las subscripciones

  loading: boolean = false;
  locale: string = "";
  country: string = "";

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    this.activatedRoute.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    });
  }
 

  ngOnInit(): void {
    this.subscriptions = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser();
    this.showSaleDetails();
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.router.navigate(['/', this.locale, this.country, 'auth', 'login']);
      }
    });
  }

  showSaleDetails() {
    let data = {
      user_id: this.CURRENT_USER_AUTHENTICATED._id,
    };

    this._ecommerceAuthService.showProfileClient(data).subscribe((resp:any) => {
      this.sale_orders = resp.sale_orders;
      console.log(this.sale_orders);
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

      this.totalPages = Math.ceil(this.sale_details.length / this.pageSize); // Calcular el número total de páginas
      this.updatePaginatedDetails();
    });
  }

  // Función para actualizar los detalles paginados
  updatePaginatedDetails(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedSaleDetails = this.sale_details.slice(start, end);
    console.log(this.paginatedSaleDetails);
    
  }

  // Función para cambiar de página
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedDetails();
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
  }
}
