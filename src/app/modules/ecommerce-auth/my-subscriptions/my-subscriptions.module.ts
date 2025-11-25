import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MySubscriptionsRoutingModule } from './my-subscriptions-routing.module';
import { MySubscriptionsComponent } from './my-subscriptions.component';
import { SubscriptionsListComponent } from './subscriptions-list/subscriptions-list.component';

@NgModule({
  declarations: [
    MySubscriptionsComponent,
    SubscriptionsListComponent
  ],
  imports: [
    CommonModule,
    MySubscriptionsRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
  ]
})
export class MySubscriptionsModule { }
