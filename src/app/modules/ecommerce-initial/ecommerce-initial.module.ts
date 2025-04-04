import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EcommerceInitialRoutingModule } from './ecommerce-initial-routing.module';
import { EcommerceInitialComponent } from './ecommerce-initial.component';
import { PreHomeComponent } from './pre-home/pre-home.component';


@NgModule({
  declarations: [
    EcommerceInitialComponent,
    PreHomeComponent
  ],
  imports: [
    CommonModule,
    EcommerceInitialRoutingModule,
    HttpClientModule,
    //
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ]
})
export class EcommerceInitialModule { }
