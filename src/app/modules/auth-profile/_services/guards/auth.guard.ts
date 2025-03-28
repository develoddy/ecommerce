import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { LocalizationService } from 'src/app/services/localization.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    public _authService: AuthService,
    public _router: Router,
    private localizationService: LocalizationService
  ){}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

      const locale = this.localizationService.locale;
      const country = this.localizationService.country;

      if ( !this._authService.user || !this._authService.token ) {
        this._router.navigate(['/', country, locale, 'auth', 'login']);
        return false;
      }

      let token = this._authService.token;
      let expiration = (JSON.parse(atob(token.split('.')[1]))).exp;
      let currentTime = Math.floor(new Date().getTime() / 1000);

      if ( currentTime >= expiration ) {
        this._router.navigate(['/', country, locale, 'auth', 'login']);
        return false;
      }

      return true;
  }
}
