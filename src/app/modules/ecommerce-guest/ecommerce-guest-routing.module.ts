import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceGuestComponent } from './ecommerce-guest.component';
import { LandingProductComponent } from './landing-product/landing-product.component';
import { FilterProductsComponent } from './filter-products/filter-products.component';
import { ListCartsComponent } from './list-carts/list-carts.component';


const routes: Routes = [
  {
    path: '',
    component: EcommerceGuestComponent,
    children: [
      {
        //path: 'landing-product/:slug',
        path: 'product/:slug',
        component: LandingProductComponent
      },
      {
        path: 'filter-products',
        component: FilterProductsComponent,
      },
      {
        path: 'filter-products/:slug/:idCategorie',
        component: FilterProductsComponent,
      },
      {
      path: "cart",
      component: ListCartsComponent,
     },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceGuestRoutingModule { }
