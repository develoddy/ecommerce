import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EcommerceAuthRoutingModule } from './ecommerce-auth-routing.module';
import { EcommerceAuthComponent } from './ecommerce-auth.component';
import { ListCartsComponent } from '../ecommerce-guest/list-carts/list-carts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CheckoutComponent } from './checkout/checkout.component';
import { ProfileClientComponent } from './profile-client/profile-client.component';
import { WishlistComponent } from '../ecommerce-auth/wishlist/wishlist.component';
import { CompareComponent } from './compare/compare.component';
import { OrderSuccessComponent } from './order-success/order-success.component';
import { MyaddressModule } from './myaddress/myaddress.module';
import { MypurchasesModule } from './mypurchases/mypurchases.module';
import { AccountComponent } from './registered/account/account.component';
import { CheckoutModule } from './checkout/checkout.module';


@NgModule({
  declarations: [
    EcommerceAuthComponent,
    ListCartsComponent,
    //CheckoutComponent,
    ProfileClientComponent,
    WishlistComponent,
    CompareComponent,
    OrderSuccessComponent,
    AccountComponent
  ],
  imports: [
    CommonModule,
    EcommerceAuthRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    // Importar el módulo de direcciones
    MyaddressModule,
    MypurchasesModule,
    CheckoutModule,
  ]
})
export class EcommerceAuthModule { }
