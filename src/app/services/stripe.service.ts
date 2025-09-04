import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { loadStripe , Stripe } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StripeService {

  private stripePromise: Promise<Stripe | null>;
  
  constructor(
    public http: HttpClient,
  ) { 
    this.stripePromise = loadStripe(environment.stripePublicKey);
  }

  /**
   * Devuelve la instancia de Stripe cargada
   */
  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  //return this.http.post(`${environment.URL_SERVICE}stripe/create-checkout-session`, data);
  createStripeSession(data: any) {
    return this.http.post(`${environment.URL_SERVICE}stripe/create-session`, data);
  }

}
