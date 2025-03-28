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


    const isFirstVisit = sessionStorage.getItem('isFirstVisit');
    console.log('Check First visita : ', isFirstVisit);
    const currentUrl = state.url;

    if (!isFirstVisit) {
      console.warn('Primera visita, permitiendo acceso...');
      this.router.navigate(['/preHome/config']); 
      sessionStorage.setItem('isFirstVisit', 'false');
      return false;
    } else {
      console.warn('No es la primera visita, redirigiendo a home...');
      return true;
    }
  }
  
}
