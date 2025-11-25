import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceAuthComponent } from './ecommerce-auth.component';
//import { ListCartsComponent } from './list-carts/list-carts.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { ProfileClientComponent } from './profile-client/profile-client.component';
import { WishlistComponent } from '../ecommerce-auth/wishlist/wishlist.component';
import { CompareComponent } from './compare/compare.component';
import { OrderSuccessComponent } from './order-success/order-success.component';
import { AccountComponent } from './registered/account/account.component';

const routes: Routes = [{
  path: '',
  component: EcommerceAuthComponent,
  children: [
    {
      path: "checkout", // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./checkout/checkout.module').then(m => m.CheckoutModule),
    },
    // {
    //   path: "checkout",
    //   component: CheckoutComponent,
    // },
    { 
      path: "my-account",
      component: ProfileClientComponent,
    },
    {
      path: "registered/account",
      component: AccountComponent,
    },
    {
      path: "favorites",
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
      path: "myaddresses", // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./myaddress/myaddress.module').then(m => m.MyaddressModule),
    },
    {
      path: 'mypurchases', // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./mypurchases/mypurchases.module').then(m => m.MypurchasesModule),
    },
    {
      path: 'my-subscriptions', // Añade la ruta para el módulo de suscripciones
      loadChildren: () => import('./my-subscriptions/my-subscriptions.module').then(m => m.MySubscriptionsModule),
    },
    {
      path: 'registered', // Añade la ruta para el módulo de direcciones
      loadChildren: () => import('./registered/registered.module').then(m => m.RegisteredModule),
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceAuthRoutingModule { }
