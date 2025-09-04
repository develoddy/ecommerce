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

    const isFirstVisit = localStorage.getItem('isFirstVisit');
    const currentUrl = state.url;

    console.log('Check First visita : ', isFirstVisit);

    if (!isFirstVisit) {
      console.warn('Primera visita, permitiendo acceso...');
      localStorage.setItem('isFirstVisit', 'true');
      this.router.navigate(['/preHome/config']); 
      return false;
    } else {
      console.warn('No es la primera visita, redirigiendo a home...');
      return true;
    }
  }
  
}
