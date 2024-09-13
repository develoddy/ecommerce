import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    public _authService: AuthService,
    public _router: Router
  ){}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      if ( !this._authService.user || !this._authService.token ) {
        this._router.navigate(["auth/login"]);
        return false;
      }

      let token = this._authService.token;
  
      let expiration = (JSON.parse(atob(token.split('.')[1]))).exp;
      if (Math.floor((new Date).getTime() / 1000) >= expiration) {
        this._authService.logout();
        return false;
      }
      return true;
  }
}
