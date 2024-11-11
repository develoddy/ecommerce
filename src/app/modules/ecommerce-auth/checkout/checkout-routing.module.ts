import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartCheckoutComponent } from './start-checkout/start-checkout.component';
import { CheckoutComponent } from './checkout.component';
import { ResumenCheckoutComponent } from './resumen-checkout/resumen-checkout.component';
import { LoginCheckoutComponent } from './login-checkout/login-checkout.component';
import { PaymentCheckoutComponent } from './payment-checkout/payment-checkout.component';
import { SuccessfullCheckoutComponent } from './successfull-checkout/successfull-checkout.component';


const routes: Routes = [{
  path: '',
  component: CheckoutComponent,
  children: [
    {path: "login", component: LoginCheckoutComponent},
    {path: "resumen", component: ResumenCheckoutComponent},
    {path: "payment", component: PaymentCheckoutComponent},
    {path: "successfull", component: SuccessfullCheckoutComponent},
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckoutRoutingModule { }
