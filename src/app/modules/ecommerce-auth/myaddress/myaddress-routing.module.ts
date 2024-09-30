import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyaddressComponent } from './myaddress.component';
import { AddAddressComponent } from './add-address/add-address.component';
import { ListAddressComponent } from './list-address/list-address.component';
import { EditAddressComponent } from './edit-address/edit-address.component';

const routes: Routes = [{
  path: '',
  component: MyaddressComponent,
  children: [
    {
      path: "",
      component: ListAddressComponent,
    },
    {
      path: "add",
      component: AddAddressComponent,
    },
    {
      path: "edit",
      component: EditAddressComponent,
    },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyaddressRoutingModule { }
