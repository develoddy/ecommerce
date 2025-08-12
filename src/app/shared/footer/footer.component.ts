import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { SubscriptionService } from 'src/app/services/subscription.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  CURRENT_USER_AUTHENTICATED:any=null;
  showSubscriptionSection: boolean = true;
  locale: string = "";
  country: string = "";
  private modalInstance: any;
  
  constructor(
    public _router: Router,
    public _cartService: CartService,
    private subscriptionService: SubscriptionService,
     private localizationService: LocalizationService,
  ) {}

  ngOnInit(): void {

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;

    this.subscriptionService.showSubscriptionSection$.subscribe(value => {
      this.showSubscriptionSection = value;
    });

    this.verifyAuthenticatedUser(); 

     // Oculta la sección de suscripción en /myaddress y cualquier ruta que incluya /edit
     const currentUrl = this._router.url;

    // Oculta la sección de suscripción en /myaddress
    //if (this._router.url === '/myaddress') { 
    if ( currentUrl === '/myaddresses' || currentUrl === '/myaddresses/add' || currentUrl.includes('/edit') || currentUrl.includes('/my-account') || currentUrl.includes('/checkout') || currentUrl.includes('/registered') || currentUrl.includes('/mypurchases') ) {
      this.showSubscriptionSection = false;
    }
  }

  gotoPoliticaCookie() {
    this._router.navigate(['/', this.locale, this.country, 'shop', 'privacy-policy']);
    this.modalInstance?.hide();
  }

  private verifyAuthenticatedUser(): void {
    this._cartService._authService.user.subscribe((user:any) => {
      this.CURRENT_USER_AUTHENTICATED = user;     
    });
  }  

}
