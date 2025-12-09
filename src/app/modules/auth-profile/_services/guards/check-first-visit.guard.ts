import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PrelaunchConfigService } from '../../../../services/prelaunch-config.service';

@Injectable({
  providedIn: 'root'
})
export class CheckFirstVisitGuard implements CanActivate {

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
        
        console.log('🔍 CheckFirstVisitGuard - Estado pre-launch:', isPrelaunchEnabled);
        
        if (isPrelaunchEnabled) {
          console.warn('🚀 PRE-LAUNCH ACTIVADO: Redirigiendo a landing page...');
          this.router.navigate(['/preHome']); 
          return false;
        }

        // ⚠️ CRÍTICO: Si viene de logout (sin tokens), NO redirigir automáticamente
        const hasUser = localStorage.getItem('user');
        const hasAccessToken = localStorage.getItem('access_token');
        
        if (!hasUser || !hasAccessToken) {
          console.warn('⚠️ CheckFirstVisitGuard: Sin autenticación, permitiendo acceso público');
          return true; // Permitir acceso para que otros guards manejen la redirección si es necesario
        }

        // 🏠 Lógica normal después del lanzamiento (solo para usuarios autenticados)
        const isFirstVisit = localStorage.getItem('isFirstVisit');

        console.log('Check First visita: ', isFirstVisit);

        if (!isFirstVisit) {
          console.warn('Primera visita autenticada, redirigiendo a preHome...');
          localStorage.setItem('isFirstVisit', 'true');
          this.router.navigate(['/preHome']); 
          return false;
        } else {
          console.warn('No es la primera visita, permitiendo acceso a home...');
          return true;
        }
      })
    );
  }
  
}
