import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListPurchasesComponent } from './list-purchases/list-purchases.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MyPurchasesRoutingModule } from './mypurchases-routing.module';
import { MypurchasesComponent } from './mypurchases.component';


@NgModule({
  declarations: [
    MypurchasesComponent,
    ListPurchasesComponent
  ],
  imports: [
    CommonModule,
    MyPurchasesRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
  ]
})
export class MypurchasesModule { }
