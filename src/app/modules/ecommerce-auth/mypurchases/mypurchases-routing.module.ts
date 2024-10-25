import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MypurchasesComponent } from './mypurchases.component';
import { ListPurchasesComponent } from './list-purchases/list-purchases.component';


const routes: Routes = [{
  path: '',
  component: MypurchasesComponent,
  children: [
    {
      path: "",
      component: ListPurchasesComponent,
    },
    /*{
      path: "add",
      component: AddAddressComponent,
    },
    {
      path: ':idAdressClient/edit',
      component: EditAddressComponent
    },*/
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyPurchasesRoutingModule { }
