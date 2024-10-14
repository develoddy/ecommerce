import { Component, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-list-purchases',
  templateUrl: './list-purchases.component.html',
  styleUrls: ['./list-purchases.component.css']
})
export class ListPurchasesComponent implements OnInit {

  euro = "€";
  sale_orders:any = [];
  sale_details:any = [];

  pageSize: number = 5; // Número de elementos por página
  currentPage: number = 1; // Página actual
  paginatedSaleDetails: any[] = []; // Detalles paginados
  totalPages: number = 0; // Total de páginas

  CURRENT_USER_AUTHENTICATED:any=null;

  loadingSubscription: Subscription = new Subscription();

  loading: boolean = false;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
  ) {}

  ngOnInit(): void {

    this.loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
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
      }
    });
  }

  showSaleDetails() {
    let data = {
      user_id: this.CURRENT_USER_AUTHENTICATED._id,
    };

    this._ecommerceAuthService.showProfileClient(data).subscribe((resp:any) => {
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

      this.totalPages = Math.ceil(this.sale_details.length / this.pageSize); // Calcular el número total de páginas
      this.updatePaginatedDetails();
      console.log("--- Debbug: showSaleDetails resp: ", this.sale_orders);

    });
  }

  // Función para actualizar los detalles paginados
  updatePaginatedDetails(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedSaleDetails = this.sale_details.slice(start, end);
  }

  // Función para cambiar de página
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedDetails();
  }

}
