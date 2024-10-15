import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var $:any;

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-edit-address',
  templateUrl: './edit-address.component.html',
  styleUrls: ['./edit-address.component.css']
})
export class EditAddressComponent implements OnInit {

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

  idAdressClient:any=null;
  queryParamsSubscription: Subscription | undefined;

  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  loadingSubscription: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    private router: Router,
    public _routerActived: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.SPINNER();
    this.verifyAuthenticatedUser();
    this.checkIfAddressClientExists();
    this.subscribeToQueryParams();
    this.showProfileClient();
  }
  
  private SPINNER() {
    this.loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  checkIfAddressClientExists() {
    this._ecommerceAuthService.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
      this.listAddressClients = resp.address_client;
      if (this.listAddressClients.length === 0) {
        // Guarda la URL actual en sessionStorage
        sessionStorage.setItem('returnUrl', this.router.url);
        
        // Redirige al formulario de agregar dirección
        this.router.navigate(['/myaddresses/add']);
      }
    });
  }

  private subscribeToQueryParams(): void {

    this.queryParamsSubscription = this._routerActived.params.subscribe(
      ( resp: any ) => {
        this.idAdressClient = resp["idAdressClient"];
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

  private showProfileClient() {
    this._ecommerceAuthService.listOneAdessClient(this.idAdressClient).subscribe( (resp:any) => {
      this.address_client_selected = resp.address_client;

      if ( this.address_client_selected ) {
        this.name       = this.address_client_selected.name;
        this.surname    = this.address_client_selected.surname;
        this.pais       = this.address_client_selected.pais;
        this.address    = this.address_client_selected.address;
        this.zipcode    = this.address_client_selected.zipcode;
        this.poblacion  = this.address_client_selected.poblacion;
        this.ciudad     = this.address_client_selected.ciudad;
        this.email      = this.address_client_selected.email;
        this.phone      = this.address_client_selected.phone;
      }
    });
  }

  public store() {
    if (this.address_client_selected) {
      this.updateAddress();
    } 
  }

  private updateAddress() {
    
    if ( !this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.email || !this.phone ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      //alertDanger("Por favor, complete los campos obligatorios de la dirección de envío.");
      return;
    }

    let data = {
      _id       : this.address_client_selected.id,
      user      : this.CURRENT_USER_AUTHENTICATED._id,
      name      : this.name,
      surname   : this.surname,
      pais      : this.pais,
      address   : this.address,
      zipcode   : this.zipcode,
      poblacion : this.poblacion,
      email     : this.email,
      phone     : this.phone,
    };

    this._ecommerceAuthService.updateAddressClient( data ).subscribe((resp:any) => {

      if ( resp.status == 200 ) {

        let INDEX = this.listAddressClients.findIndex((item:any) => item.id == this.address_client_selected.id);
        this.listAddressClients[INDEX] = resp.address_client;

        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
        this.router.navigate(['/myaddresses']);
        alertSuccess(resp.message);
        this.resetForm();

      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al actualizar la dirección.";
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      }
      
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al actualizar la dirección.";
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
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

}
