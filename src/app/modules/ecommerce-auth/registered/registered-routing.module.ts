import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisteredComponent } from './registered.component';
import { AccountComponent } from './account/account.component';
import { MessageSuccessComponent } from './message-success/message-success.component';

const routes: Routes = [{
  path: '',
  component: RegisteredComponent,
  children: [
    {
      path: "account",
      component: AccountComponent,
    },
    
    {
      path: 'messageSuccess',
      component: MessageSuccessComponent
    },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisteredRoutingRoutingModule { }
