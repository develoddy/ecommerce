import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckFirstVisitGuard implements CanActivate {

  constructor(private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // 🚀 PRE-LAUNCH MODE: Siempre redirigir a preHome hasta el lanzamiento
    const PRE_LAUNCH_MODE = true; // ✅ Cambiar a false el día del lanzamiento

    if (PRE_LAUNCH_MODE) {
      console.warn('🚀 PRE-LAUNCH: Redirigiendo a landing page...');
      this.router.navigate(['/preHome']); 
      return false;
    }

    // ⚠️ CRÍTICO: Si viene de logout (sin tokens), NO redirigir automáticamente
    const hasUser = localStorage.getItem('user');
    const hasAccessToken = localStorage.getItem('access_token');
    
    if (!hasUser || !hasAccessToken) {
      console.warn('⚠️ CheckFirstVisitGuard: Sin autenticación, bloqueando acceso a /home');
      // Si intentan acceder a /home sin tokens, permitir para que otros guards manejen la redirección
      return true; // Dejar pasar, otros guards redirigirán si es necesario
    }

    // 🏠 Lógica normal después del lanzamiento (solo para usuarios autenticados)
    const isFirstVisit = localStorage.getItem('isFirstVisit');

    console.log('Check First visita: ', isFirstVisit);

    if (!isFirstVisit) {
      console.warn('Primera visita, redirigiendo a preHome...');
      localStorage.setItem('isFirstVisit', 'true');
      this.router.navigate(['/preHome']); 
      return false;
    } else {
      console.warn('No es la primera visita, permitiendo acceso a home...');
      return true;
    }
  }
  
}
