import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { Router } from '@angular/router';

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

  // Address
  name: string = '';
  surname: string = '';
  pais: string = '';
  address: string = '';
  zipcode: string = '';
  poblacion: string = '';
  ciudad: string = '';
  email: string = '';
  phone: string = '';
    
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  loadingSubscription: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.SPINNER();
    this.verifyAuthenticatedUser();
  }

  private SPINNER() {
    this.loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
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
    if ( !this.address_client_selected ) {
      this.registerAddress();
    } 
  }

  private registerAddress() {

    if ( !this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.ciudad || !this.email || !this.phone ) {
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
    };
    
    this._ecommerceAuthService.registerAddressClient(data).subscribe( ( resp:any ) => {

      if ( resp.status == 200 ) {

        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();
        alertSuccess(resp.message);
        this.resetForm();

        this.router.navigate(['/myaddress']);

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
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }
}
