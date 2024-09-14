import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EcommerceGuestRoutingModule } from './ecommerce-guest-routing.module';
import { EcommerceGuestComponent } from './ecommerce-guest.component';
import { LandingProductComponent } from './landing-product/landing-product.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FilterProductsComponent } from './filter-products/filter-products.component';
import { WishlistComponent } from '../ecommerce-guest/wishlist/wishlist.component';

@NgModule({
  declarations: [
    EcommerceGuestComponent,
    LandingProductComponent,
    FilterProductsComponent,
    WishlistComponent,
  ],
  imports: [
    CommonModule,
    EcommerceGuestRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule
  ]
})
export class EcommerceGuestModule { }
