// checkout.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  // Creamos un BehaviorSubject para manejar el valor de 'navigatingToPayment'
  private navigatingToPaymentSubject = new BehaviorSubject<boolean>(false);

  // Creamos un BehaviorSubject para manejar el valor de 'isSaleSuccess'
  private isSaleSuccessSubject = new BehaviorSubject<boolean>(false);

  // Observable que se puede suscribir desde otros componentes
  navigatingToPayment$ = this.navigatingToPaymentSubject.asObservable();
  isSaleSuccess$ = this.isSaleSuccessSubject.asObservable();

  // Método para actualizar el valor de 'navigatingToPayment'
  setNavigatingToPayment(value: boolean): void {
    this.navigatingToPaymentSubject.next(value);
  }

  // Método para obtener el valor actual de 'navigatingToPayment'
  getNavigatingToPayment(): boolean {
    return this.navigatingToPaymentSubject.value;
  }

  // Método para actualizar el valor de 'isSaleSuccess'
  setSaleSuccess(value: boolean): void {
    this.isSaleSuccessSubject.next(value);
  }

  // Método para obtener el valor actual de 'isSaleSuccess'
  getSaleSuccess(): boolean {
    return this.isSaleSuccessSubject.value;
  }
}
