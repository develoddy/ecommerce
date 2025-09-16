import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartCheckoutComponent } from './start-checkout/start-checkout.component';
import { CheckoutAuthGuard } from 'src/app/guards/checkout-auth.guard';
import { CheckoutComponent } from './checkout.component';
import { ResumenCheckoutComponent } from './resumen-checkout/resumen-checkout.component';
import { LoginCheckoutComponent } from './login-checkout/login-checkout.component';
import { PaymentCheckoutComponent } from './payment-checkout/payment-checkout.component';
import { SuccessfullCheckoutComponent } from './successfull-checkout/successfull-checkout.component';
import { DeliveryComponent } from './delivery/delivery.component';


const routes: Routes = [{
  path: '',
  component: CheckoutComponent,
  canActivateChild: [CheckoutAuthGuard],
  children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
    {path: "login", component: LoginCheckoutComponent},
    {path: "delivery", component: DeliveryComponent},
    {path: "resumen", component: ResumenCheckoutComponent, data: { step: 2 }},
    {path: "payment", component: PaymentCheckoutComponent, data: { step: 3 }},
    {path: "successfull", component: SuccessfullCheckoutComponent, data: { step: 4 }},
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckoutRoutingModule { }
