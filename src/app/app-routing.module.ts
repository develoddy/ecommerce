import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './modules/auth-profile/_services/guards/auth.guard';
import { CheckFirstVisitGuard } from './modules/auth-profile/_services/guards/check-first-visit.guard';
import { CustomPreloadingStrategy } from './services/customPreLoadingStrategy.service';

const routes: Routes = [

  // Redirección de la raíz a /es/es/home
  {
    path: '',
    redirectTo: 'es/es/home', // País y el idioma por defecto
    pathMatch: 'full'
  },
  // Ruta para preHome fuera de la estructura de locale/country
  { 
    path: 'preHome', 
    loadChildren: () => import('./modules/ecommerce-initial/ecommerce-initial.module').then(m => m.EcommerceInitialModule),
    data: { preload: true } // Podemos precargar 
  },
  {
    path: ':country/:locale',
    children: [
      {
        path: 'home',
        canActivate: [CheckFirstVisitGuard],
        loadChildren: () => import("./modules/home/home.module").then(m => m.HomeModule),
        data: { preload: true } // PRELOAD para Home
      },
      {
        path: 'shop',
        loadChildren: () => import("./modules/ecommerce-guest/ecommerce-guest.module").then(m => m.EcommerceGuestModule),
        data: { preload: false } // 🔹 solo se carga cuando el usuario entra
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
      // Redirección al home por defecto si solo ponen /:country/:locale
      {
        path: '',
        redirectTo: 'home',
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
    initialNavigation: 'enabledBlocking',
    preloadingStrategy: CustomPreloadingStrategy
})],
  exports: [RouterModule],
})
export class AppRoutingModule { }
