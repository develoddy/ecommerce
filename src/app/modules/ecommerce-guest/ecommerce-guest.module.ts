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
import { CategorySliderComponent } from './filter-products/category-slider/category-slider.component';
import { ToolbarComponent } from './filter-products/toolbar/toolbar.component';
import { SidebarFilterComponent } from './filter-products/sidebar-filter/sidebar-filter.component';
import { ProductsListComponent } from './filter-products/products-list/products-list.component';
import { PrivacyPolicyComponent } from './legales/privacy-policy/privacy-policy.component';


@NgModule({
  declarations: [
    EcommerceGuestComponent,
    LandingProductComponent,
    FilterProductsComponent,
    PrivacyPolicyComponent,
    CategorySliderComponent,
    ToolbarComponent,
    SidebarFilterComponent,
    ProductsListComponent,
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
