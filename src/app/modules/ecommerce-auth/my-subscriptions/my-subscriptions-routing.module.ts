import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MySubscriptionsComponent } from './my-subscriptions.component';
import { SubscriptionsListComponent } from './subscriptions-list/subscriptions-list.component';

const routes: Routes = [{
  path: '',
  component: MySubscriptionsComponent,
  children: [
    {
      path: '',
      component: SubscriptionsListComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MySubscriptionsRoutingModule { }
