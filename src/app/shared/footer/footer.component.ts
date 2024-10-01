import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  CURRENT_USER_AUTHENTICATED:any=null;
  showSubscriptionSection: boolean = true;

  constructor(
    public _router: Router,
    public _cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.verifyAuthenticatedUser(); 

     // Oculta la sección de suscripción en /myaddress y cualquier ruta que incluya /edit
     const currentUrl = this._router.url;

    // Oculta la sección de suscripción en /myaddress
    //if (this._router.url === '/myaddress') { 
    if ( currentUrl === '/myaddress' || currentUrl === '/myaddress/add' || currentUrl.includes('/edit') || currentUrl.includes('/profile') || currentUrl.includes('/payment-process') ) {
      this.showSubscriptionSection = false;
    }
  }

  private verifyAuthenticatedUser(): void {
    this._cartService._authService.user.subscribe((user:any) => {
      this.CURRENT_USER_AUTHENTICATED = user;     
    });
  }  

}
