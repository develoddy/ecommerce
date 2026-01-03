import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PrelaunchConfigService } from '../../../../services/prelaunch-config.service';

@Injectable({
  providedIn: 'root'
})
export class PrelaunchGuard implements CanActivate {

  // 🆕 LISTA BLANCA: Rutas que NO están protegidas por prelaunch
  private whitelistedRoutes: string[] = [
    '/preHome',                      // Landing de prelaunch
    '/labs',                         // Catálogo de experimentos
    '/account/checkout',             // Checkout completo (todas las sub-rutas)
  ];

  // 🆕 Patrones regex para rutas dinámicas
  private dynamicRoutePatterns: RegExp[] = [
    /^\/[^\/]+$/,                    // Módulos dinámicos: /seo-dashboard, /otro-modulo, etc.
    /^\/[a-z]{2}\/[a-z]{2}\/account\/checkout/  // Checkout con i18n: /es/es/account/checkout
  ];

  constructor(
    private router: Router,
    private prelaunchConfigService: PrelaunchConfigService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // 🆕 VERIFICAR SI LA RUTA ESTÁ EN LA LISTA BLANCA (exacta o por prefijo)
    const isWhitelisted = this.whitelistedRoutes.some(whitelistedRoute => 
      state.url === whitelistedRoute || state.url.startsWith(whitelistedRoute + '/')
    );

    if (isWhitelisted) {
      console.log('✅ Ruta en lista blanca, permitiendo acceso:', state.url);
      return true;
    }

    // 🆕 VERIFICAR SI LA RUTA COINCIDE CON PATRONES DINÁMICOS
    const matchesDynamicPattern = this.dynamicRoutePatterns.some(pattern => 
      pattern.test(state.url)
    );

    if (matchesDynamicPattern) {
      console.log('✅ Ruta dinámica detectada, permitiendo acceso:', state.url);
      return true;
    }

    // 🚀 VERIFICAR PRE-LAUNCH DE MANERA ASÍNCRONA
    return this.prelaunchConfigService.getPrelaunchStatus().pipe(
      take(1), // Solo tomar un valor y completar
      map(isPrelaunchEnabled => {
        
        console.log('🔒 PrelaunchGuard - Estado pre-launch:', isPrelaunchEnabled);
        console.log('🔒 PrelaunchGuard - Ruta solicitada:', state.url);
        
        if (isPrelaunchEnabled) {
          console.warn('🚀 PRE-LAUNCH ACTIVADO: Bloqueando acceso a', state.url);
          console.warn('🚀 Redirigiendo a landing page...');
          this.router.navigate(['/preHome']); 
          return false;
        }

        console.log('✅ Pre-launch desactivado, permitiendo acceso a:', state.url);
        return true;
      })
    );
  }
  
}