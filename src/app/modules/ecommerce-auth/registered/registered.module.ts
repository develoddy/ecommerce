import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { RegisteredComponent } from './registered.component';
import { RegisteredRoutingRoutingModule } from './registered-routing.module';
import { MessageSuccessComponent } from './message-success/message-success.component';
//import { MyPurchasesRoutingModule } from './mypurchases-routing.module'


@NgModule({
  declarations: [RegisteredComponent, MessageSuccessComponent],
  imports: [
    CommonModule,
    RegisteredRoutingRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
  ]
})
export class RegisteredModule { }
