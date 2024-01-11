import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EcommerceAuthRoutingModule } from './ecommerce-auth-routing.module';
import { EcommerceAuthComponent } from './ecommerce-auth.component';
import { ListCartsComponent } from './list-carts/list-carts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  declarations: [
    EcommerceAuthComponent,
    ListCartsComponent
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
  ]
})
export class EcommerceAuthModule { }
