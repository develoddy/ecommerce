import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './modules/auth-profile/_services/guards/auth.guard';
import { CheckFirstVisitGuard } from './modules/auth-profile/_services/guards/check-first-visit.guard';
import { PrelaunchGuard } from './modules/auth-profile/_services/guards/prelaunch.guard';
import { CustomPreloadingStrategy } from './services/customPreLoadingStrategy.service';
import { ModuleResolver } from './guards/module.resolver';
import { ModuleActiveGuard } from './guards/module-active.guard';
import { ModuleLandingComponent } from './components/module-landing/module-landing.component';
import { LabsComponent } from './components/labs/labs.component';
import { TrialRegisterComponent } from './components/trial-register/trial-register.component';
import { SaasDashboardComponent } from './components/saas-dashboard/saas-dashboard.component';
import { TenantLoginComponent } from './components/tenant-login/tenant-login.component';
import { TenantAuthGuard } from './guards/tenant-auth.guard';

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
  
  // 🆕 Ruta para Labs (catálogo de experimentos)
  {
    path: 'labs',
    children: [
      // Catálogo de módulos
      {
        path: '',
        component: LabsComponent
      },
      // Landing de módulo específico
      {
        path: ':moduleKey',
        component: ModuleLandingComponent,
        resolve: { module: ModuleResolver },
        canActivate: [ModuleActiveGuard]
      }
    ]
  },

  // 🆕 Ruta para registro de trial SaaS
  {
    path: 'trial/register',
    component: TrialRegisterComponent
  },

  // 🆕 Ruta para login de tenants
  {
    path: 'tenant/login',
    component: TenantLoginComponent
  },

  // 🆕 Ruta para dashboard SaaS (protegida)
  {
    path: 'app/:moduleKey',
    component: SaasDashboardComponent,
    canActivate: [TenantAuthGuard]
  },

  // 🔹 Rutas i18n existentes (NO tocar - Merch store)
  {
    path: ':country/:locale',
    children: [
      {
        path: 'home',
        canActivate: [PrelaunchGuard, CheckFirstVisitGuard],
        loadChildren: () => import("./modules/home/home.module").then(m => m.HomeModule),
        data: { preload: true } // PRELOAD para Home
      },
      {
        path: 'shop',
        canActivate: [PrelaunchGuard],
        loadChildren: () => import("./modules/ecommerce-guest/ecommerce-guest.module").then(m => m.EcommerceGuestModule),
        data: { preload: false } // 🔹 solo se carga cuando el usuario entra
      },
      {
        path: 'account',
        canActivate: [PrelaunchGuard], // AuthGuard se aplicará internamente si es necesario
        loadChildren: () => import("./modules/ecommerce-auth/ecommerce-auth.module").then(m => m.EcommerceAuthModule),
      },
      {
        path: 'auth',
        canActivate: [PrelaunchGuard],
        loadChildren: () => import("./modules/auth-profile/auth-profile.module").then(m => m.AuthProfileModule),
      },
      {
        path: 'tracking',
        canActivate: [PrelaunchGuard],
        loadChildren: () => import("./modules/tracking/tracking.module").then(m => m.TrackingModule),
        data: { preload: false } // ✅ Ruta pública de tracking
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
