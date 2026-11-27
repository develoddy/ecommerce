import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ecommerce-auth',
  templateUrl: './ecommerce-auth.component.html',
  styleUrls: ['./ecommerce-auth.component.css']
})
export class EcommerceAuthComponent {

  constructor(private router: Router) {}

  get isPhysicalCheckout(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    const segments = path.split('/').filter(Boolean);

    if (segments[2] !== 'account' || segments[3] !== 'checkout') {
      return false;
    }

    try {
      return !sessionStorage.getItem('modulePurchase');
    } catch {
      return false;
    }
  }


}
