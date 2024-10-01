import { Component, OnInit } from '@angular/core';
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
export class ListAddressComponent implements OnInit  {

  euro = "€";

  // Address
  listAddressClients:any = [];
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  loadingSubscription: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService, 
  ) {}

  ngOnInit(): void {
    this.SPINNER();
    this.verifyAuthenticatedUser();
    this.showProfileClient();
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
  
  showProfileClient() {
    this._ecommerceAuthService.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp:any) => {
      this.listAddressClients = resp.address_client;
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
  }

}
