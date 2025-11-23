import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceInitialComponent } from './ecommerce-initial.component';
import { PreHomeComponent } from './pre-home/pre-home.component';
import { PreLaunchLandingComponent } from './pre-launch-landing/pre-launch-landing.component';

const routes: Routes = [
  { 
    path: '', component: EcommerceInitialComponent,
    children: [
      {
        path: '',
        component: PreHomeComponent // ✅ ACTIVAR: Tienda completa en lanzamiento
        //component: PreLaunchLandingComponent // ❌ DESACTIVAR: Landing pre-lanzamiento
      },
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
