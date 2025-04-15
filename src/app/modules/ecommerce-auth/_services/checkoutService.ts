// checkout.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  // Estado para saber si se navega al paso de pago
  private navigatingToPaymentSubject = new BehaviorSubject<boolean>(false);
  navigatingToPayment$ = this.navigatingToPaymentSubject.asObservable();

  // Estado para saber si la venta se ha realizado con éxito
  private isSaleSuccessSubject = new BehaviorSubject<boolean>(false);
  isSaleSuccess$ = this.isSaleSuccessSubject.asObservable();

  // Datos relacionados con la venta final
  private saleDataSubject = new BehaviorSubject<any>(null);
  saleData$ = this.saleDataSubject.asObservable();

  // -- Navegación a paso de pago --
  setNavigatingToPayment(value: boolean): void {
    this.navigatingToPaymentSubject.next(value);
  }

  getNavigatingToPayment(): boolean {
    return this.navigatingToPaymentSubject.value;
  }

  // -- Estado de venta completada --
  setSaleSuccess(value: boolean): void {
    this.isSaleSuccessSubject.next(value);
  }

  getSaleSuccess(): boolean {
    return this.isSaleSuccessSubject.value;
  }

  // -- Datos de la venta --
  setSaleData(sale: any) {
    this.saleDataSubject.next(sale);
  }

  getSaleData(): any {
    return this.saleDataSubject.value;
  }
}
