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

    // 🏠 Lógica normal después del lanzamiento
    const isFirstVisit = localStorage.getItem('isFirstVisit');
    const currentUrl = state.url;

    console.log('Check First visita : ', isFirstVisit);

    if (!isFirstVisit) {
      console.warn('Primera visita, permitiendo acceso...');
      localStorage.setItem('isFirstVisit', 'true');
      this.router.navigate(['/preHome']); 
      return false;
    } else {
      console.warn('No es la primera visita, redirigiendo a home...');
      return true;
    }
  }
  
}
