import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';

declare var $:any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-delivery',
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.css']
})
export class DeliveryComponent implements OnInit {


  address_client_selected:any = null;
    listAddressGuest:any = [];
  
    returnUrl: string = 'myaddresses';  // Valor por defecto si no se pasa ningún returnUrl
  
    // Address
    guest_id: any = 0
    name: string = '';
    surname: string = '';
    pais: string = '';
    address: string = '';
    zipcode: string = '';
    poblacion: string = '';
    ciudad: string = '';
    email: string | null = null;
    phone: string = '';
    usual_shipping_address:boolean=false;
      
    errorOrSuccessMessage:any="";
    validMessage:boolean=false;
    status:boolean=false;
    loading: boolean = false;
    //loadingSubscription: Subscription = new Subscription();
    private subscriptions: Subscription = new Subscription();
    CURRENT_USER_AUTHENTICATED:any=null;
    CURRENT_USER_GUEST:any=null;
  
    locale: string = "";
    country: string = "";

    isMobile: boolean = false;
    isTablet: boolean = false;
    isDesktop: boolean = false;
  
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
      
      this.SPINNER();
      this.checkDeviceType();
      
      // Captura la URL de retorno si existe
      this.returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl') || `/${this.country}/${this.locale}/account/myaddresses`;
      this.verifyAuthenticatedUser();
      this.subscribeToQueryParams();
    }

    private checkDeviceType(): void {
      const width = window.innerWidth;
      this.isMobile = width <= 480;
      this.isTablet = width > 480 && width <= 768;
      this.isDesktop = width > 768;
    }
  
    private subscribeToQueryParams(): void {
      const queryParamsSubscription = this.activatedRoute.queryParams.subscribe((resp: any) => {
        this.email = resp["email"];
      });
      // Añadir todas las suscripciones al objeto compuesto
      this.subscriptions.add(queryParamsSubscription);
    }

    goToBackResumenStep() {
    //this.checkoutService.setNavigatingToPayment(true);
    this.router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
  }
  
    private SPINNER() {
      this.subscriptions = this._ecommerceAuthService.loading$.subscribe(isLoading => {
        this.loading = isLoading;
      });
    }

    verifyAuthenticatedUser(): void {
      this._ecommerceAuthService._authService.user.pipe().subscribe(user => {
        if (user) {
          this.CURRENT_USER_AUTHENTICATED = user;
          this.CURRENT_USER_GUEST = null;
        } else {
          this._ecommerceAuthService._authService.userGuest.subscribe(guestUser => {
            if (guestUser?.guest) {
              this.CURRENT_USER_GUEST = guestUser;
            }
          });
        }
      });
    }
    
    public store() {  
      if ( !this.address_client_selected ) {
        console.log("--- 2. dentro: ", this.address_client_selected);
        this.registerAddress();
      } 
    }
  
    private registerAddress() {
      if (
        !this.CURRENT_USER_GUEST || 
        !this.name || 
        !this.surname || 
        !this.pais || 
        !this.address || 
        !this.zipcode || 
        !this.poblacion || 
        !this.ciudad || 
        !this.email || 
        !this.phone 
      ) {
        this.status = false;
        this.validMessage = true;
        this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío";
        this.hideMessageAfterDelay();
        alertDanger("Por favor, complete los campos obligatorios de la dirección de envío");
        return;
      }
  
      let data = {    
          guest     : this.CURRENT_USER_GUEST.id,
          name      : this.name,
          surname   : this.surname,
          pais      : this.pais,
          address   : this.address,
          zipcode   : this.zipcode,
          poblacion : this.poblacion,
          ciudad    : this.ciudad,
          email     : this.email,
          phone     : this.phone,
          usual_shipping_address: this.usual_shipping_address,
      };

      this._ecommerceAuthService.registerAddressGuest(data).subscribe( ( resp:any ) => {
  
        if ( resp.status == 200 ) {
          this.status = true;
          this.validMessage = true;
          this.errorOrSuccessMessage = resp.message;
          this.hideMessageAfterDelay();
          alertSuccess(resp.message);
          this.resetForm();
          this.router.navigateByUrl(this.returnUrl);
          //this.router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
        } else {
          this.status = false;
          this.errorOrSuccessMessage = "Error al registrar la dirección.";
          this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
        }
      }, error => {
        this.status = false;
        this.errorOrSuccessMessage = "Error al registrar la dirección.";
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      });
    }
  
    private resetForm() {
      this.name = '';
      this.surname = '';
      this.pais = '';
      this.address = '';
      this.zipcode = '';
      this.poblacion = '';
      this.email = '';
      this.phone = '';
    }
  
  
    private hideMessageAfterDelay() {
      setTimeout(() => {
        this.validMessage = false;
      }, 6000); // Desaparece después de 3 segundos
    }
  
    ngOnDestroy(): void {
      if (this.subscriptions) {
        this.subscriptions.unsubscribe();
      }
    }

}
