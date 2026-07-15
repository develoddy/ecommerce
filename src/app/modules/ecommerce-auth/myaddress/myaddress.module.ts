import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyaddressComponent } from './myaddress.component';
import { MyaddressRoutingModule } from './myaddress-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AddAddressComponent } from './add-address/add-address.component';
import { ListAddressComponent } from './list-address/list-address.component';
import { EditAddressComponent } from './edit-address/edit-address.component';



@NgModule({
  declarations: [
    MyaddressComponent,
    ListAddressComponent,
    AddAddressComponent,
    EditAddressComponent,
  ],
  imports: [
    CommonModule,
    MyaddressRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
  ]
})
export class MyaddressModule { }
