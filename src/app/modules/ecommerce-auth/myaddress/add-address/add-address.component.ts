import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var $:any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-add-address',
  templateUrl: './add-address.component.html',
  styleUrls: ['./add-address.component.css']
})
export class AddAddressComponent implements OnInit {

  address_client_selected:any = null;
  listAddressClients:any = [];

  returnUrl: string = 'myaddresses';  // Valor por defecto si no se pasa ningún returnUrl

  // Address
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
  private isSubmitting: boolean = false; // Prevenir múltiples submissions
  //loadingSubscription: Subscription = new Subscription();
  private subscriptions: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;

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
    
    this.SPINNER();
    
    // Captura la URL de retorno si existe
    this.returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl') || `/${this.country}/${this.locale}/account/myaddresses`;
    
    this.verifyAuthenticatedUser();
    this.subscribeToQueryParams();
  }

  private subscribeToQueryParams(): void {
    const queryParamsSubscription = this.activatedRoute.queryParams.subscribe((resp: any) => {
      this.email = resp["email"];
    });
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(queryParamsSubscription);
  }

  private SPINNER() {
    this.subscriptions = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
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

  public store() {
    // Prevenir múltiples submissions
    if (this.isSubmitting) {
      console.log('⚠️ [AddAddress] Already submitting, skipping...');
      return;
    }
    
    if ( !this.address_client_selected ) {
      console.log('🔍 [AddAddress] Calling registerAddress()');
      this.registerAddress();
    } else {
      console.log('🔍 [AddAddress] Skipping registerAddress() - address_client_selected exists');
    }
  }

  /** Metodo para registrar direcciones de usuarios autenticados */
  private registerAddress() {
    
    if (
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
        user      : this.CURRENT_USER_AUTHENTICATED._id,
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
    
    
    
    // Marcar como enviando para evitar duplicados
    this.isSubmitting = true;
    
    this._ecommerceAuthService.registerAddressClient(data).subscribe(
    ( resp:any ) => {
      
      if ( resp.status == 200 ) {
        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();
        alertSuccess(resp.message);
        this.resetForm();
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al registrar la dirección.";
        this.hideMessageAfterDelay();  // Ocultar el mensaje después de X segundos
      }
      
      // Resetear flag de submission al finalizar
      this.isSubmitting = false;
    }, error => {
      console.log('❌ [AddAddress] Backend error:', error);
      this.status = false;
      this.errorOrSuccessMessage = "Error al registrar la dirección.";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      
      // Resetear flag de submission en caso de error
      this.isSubmitting = false;
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
