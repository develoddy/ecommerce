import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceInitialComponent } from './ecommerce-initial.component';
import { PreHomeComponent } from './pre-home/pre-home.component';

const routes: Routes = [
  { 
    path: '', component: EcommerceInitialComponent,
    children: [
      {
        path: 'config',
        component: PreHomeComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceInitialRoutingModule { }
