import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PrelaunchConfigService } from '../../../../services/prelaunch-config.service';

@Injectable({
  providedIn: 'root'
})
export class PrelaunchGuard implements CanActivate {

  constructor(
    private router: Router,
    private prelaunchConfigService: PrelaunchConfigService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

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