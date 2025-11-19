import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var $:any;

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-list-address',
  templateUrl: './list-address.component.html',
  styleUrls: ['./list-address.component.css']
})
export class ListAddressComponent implements OnInit, OnDestroy {

  euro = "€";

  // Address
  listAddressClients:any = [];
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  private subscriptions: Subscription = new Subscription();
  loadingSubscription: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;
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
    this.verifyAuthenticatedUser();
  }

  private SPINNER() {
    this.loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  private verifyAuthenticatedUser(): void {
    const userSubscription = this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.showProfileClient();
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
      }
    });
    
    // Añadir la suscripción para limpiarla después
    this.loadingSubscription.add(userSubscription);
  }
  
  showProfileClient() {
    // Evitar llamadas múltiples si ya se están cargando las direcciones
    if (this.loading) {
      return;
    }
    
    this._ecommerceAuthService.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp:any) => {
      // Limpiar array antes de asignar para evitar duplicaciones visuales
      this.listAddressClients = [];
      
      // Asignar las direcciones únicas basándose en ID
      const uniqueAddresses = resp.address_client || [];
      const addressMap = new Map();
      
      uniqueAddresses.forEach((address: any) => {
        addressMap.set(address.id, address);
      });
      
      this.listAddressClients = Array.from(addressMap.values());
      console.log("🔍 [ListAddress] Raw response:", resp.address_client?.length || 0, "items");
      console.log("🔍 [ListAddress] Unique addresses:", this.listAddressClients.length, "items");
      console.log("🔍 [ListAddress] Final list:", this.listAddressClients);
    });
  }

  hideMessageAfterDelay() {
    setTimeout(() => {
      this.validMessage = false;
    }, 6000); // Desaparece después de 3 segundos
  }

  removeAddressSelected(list_address:any) {
    this._ecommerceAuthService.deleteAddressClient(list_address.id).subscribe((resp:any) => {      
      let INDEX = this.listAddressClients.findIndex((item:any) => item.id == list_address.id);
      if (INDEX !== -1) { 
        this.listAddressClients.splice(INDEX, 1);
      }
      alertSuccess(resp.message);
    });
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }

}
