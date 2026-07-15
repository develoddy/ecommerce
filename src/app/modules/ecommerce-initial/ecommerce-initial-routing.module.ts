import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EcommerceInitialComponent } from './ecommerce-initial.component';
import { PreHomeComponent } from './pre-home/pre-home.component';
import { PreLaunchLandingComponent } from './pre-launch-landing/pre-launch-landing.component';
import { PrelaunchModeResolver } from './prelaunch-mode.resolver';

const routes: Routes = [
  { 
    path: '', 
    component: EcommerceInitialComponent,
    resolve: { prelaunchData: PrelaunchModeResolver },
    children: [
      {
        path: '',
        // El componente se determina dinámicamente en el componente padre
        component: PreHomeComponent // Default fallback
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
