import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './modules/auth-profile/_services/guards/auth.guard';
import { CheckFirstVisitGuard } from './modules/auth-profile/_services/guards/check-first-visit.guard';

const routes: Routes = [

  // Redirección de la raíz a /es/es/home
  {
    path: '',
    redirectTo: 'es/es/home', // Idioma y país por defecto
    pathMatch: 'full'
  },
  // Ruta para preHome fuera de la estructura de locale/country
  { 
    path: 'preHome', 
    loadChildren: () => import('./modules/ecommerce-initial/ecommerce-initial.module').then(m => m.EcommerceInitialModule) 
  },
  {
    path: ':locale/:country',
    children: [
      {
        path: 'home',
        canActivate: [CheckFirstVisitGuard],
        loadChildren: () => import("./modules/home/home.module").then(m => m.HomeModule),
      },
      {
        path: 'shop',
        loadChildren: () => import("./modules/ecommerce-guest/ecommerce-guest.module").then(m => m.EcommerceGuestModule),
      },
      {
        path: 'account',
        //canActivate: [AuthGuard],
        loadChildren: () => import("./modules/ecommerce-auth/ecommerce-auth.module").then(m => m.EcommerceAuthModule),
      },
      {
        path: 'auth',
        loadChildren: () => import("./modules/auth-profile/auth-profile.module").then(m => m.AuthProfileModule),
      },
      {
        path: '',
        redirectTo: '/',
        pathMatch: 'full'
      },
      {
        path: '**',
        redirectTo: 'error/404'
      }
    ],
  },
  // Ruta para manejar cualquier otra URL no válida
  {
    path: '**',
    redirectTo: 'error/404'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule],
})
export class AppRoutingModule { }
