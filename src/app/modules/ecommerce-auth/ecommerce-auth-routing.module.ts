import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceAuthComponent } from './ecommerce-auth.component';
import { ListCartsComponent } from './list-carts/list-carts.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { ProfileClientComponent } from './profile-client/profile-client.component';
import { WishlistComponent } from '../ecommerce-auth/wishlist/wishlist.component';
import { CompareComponent } from './compare/compare.component';
import { OrderSuccessComponent } from './order-success/order-success.component';

const routes: Routes = [{
  path: '',
  component: EcommerceAuthComponent,
  children: [
    {
      path: "list-carts",
      component: ListCartsComponent,
    },
    {
      path: "payment-process",
      component: CheckoutComponent,
    },
    {
      path: "profile",
      component: ProfileClientComponent,
    },
    {
      path: "wishlist",
      component: WishlistComponent,
    },
    {
      path: "compare",
      component: CompareComponent,
    },
    {
      path: "order-success",
      component: OrderSuccessComponent,
    },
    {
      path: 'myaddress', // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./myaddress/myaddress.module').then(m => m.MyaddressModule),
    },
    {
      path: 'mypurchases', // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./mypurchases/mypurchases.module').then(m => m.MypurchasesModule),
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceAuthRoutingModule { }
