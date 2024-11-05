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

    if (!isFirstVisit) {
      console.log('Primera visita, permitiendo acceso...');
      this.router.navigate(['/pre-home/config']); 
      localStorage.setItem('isFirstVisit', 'false');
      return false;
    } else {
      console.log('No es la primera visita, redirigiendo a home...');
      return true;
    }
  }
  
}
