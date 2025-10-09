import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceGuestComponent } from './ecommerce-guest.component';
import { LandingProductComponent } from './landing-product/landing-product.component';
import { FilterProductsComponent } from './filter-products/filter-products.component';
import { ListCartsComponent } from './list-carts/list-carts.component';
import { PrivacyPolicyComponent } from './legales/privacy-policy/privacy-policy.component';


const routes: Routes = [
  {
    path: '',
    component: EcommerceGuestComponent,
    children: [
      {
        path: 'product/:slug',
        component: LandingProductComponent
      },
      {
        path: 'filter-products',
        component: FilterProductsComponent,
      },
      {
        path: 'filter-products/:slug',
        component: FilterProductsComponent,
      },
      {
        path: 'filter-products/:slug/:idCategorie',
        component: FilterProductsComponent,
      },
      {
        path: 'filter-products/:slug/:idCategorie/:logo_position',
        component: FilterProductsComponent,
      },
      {
        path: "cart",
        component: ListCartsComponent,
      },
      { 
        path: 'privacy-policy', 
        component: PrivacyPolicyComponent 
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceGuestRoutingModule { }
