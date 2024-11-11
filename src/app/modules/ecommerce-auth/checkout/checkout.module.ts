import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CheckoutRoutingModule } from './checkout-routing.module';
import { StartCheckoutComponent } from './start-checkout/start-checkout.component';
import { CheckoutComponent } from './checkout.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { LoginCheckoutComponent } from './login-checkout/login-checkout.component';
import { ResumenCheckoutComponent } from './resumen-checkout/resumen-checkout.component';
import { PaymentCheckoutComponent } from './payment-checkout/payment-checkout.component';
import { SuccessfullCheckoutComponent } from './successfull-checkout/successfull-checkout.component';


@NgModule({
  declarations: [
    CheckoutComponent,
    StartCheckoutComponent,
    LoginCheckoutComponent,
    ResumenCheckoutComponent,
    PaymentCheckoutComponent,
    SuccessfullCheckoutComponent,
  ],
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
  ]
})
export class CheckoutModule { }
