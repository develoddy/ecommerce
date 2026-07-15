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

      // ✅ Verificar tokens en localStorage (fuente de verdad)
      const accessToken = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');

      if ( !user || !accessToken ) {
        console.log('🚫 AuthGuard: No hay usuario o token, redirigiendo a login');
        this._router.navigate(['/', country, locale, 'auth', 'login']);
        return false;
      }

      // Verificar expiración del token
      try {
        let expiration = (JSON.parse(atob(accessToken.split('.')[1]))).exp;
        let currentTime = Math.floor(new Date().getTime() / 1000);

        if ( currentTime >= expiration ) {
          console.log('⏰ AuthGuard: Token expirado, redirigiendo a login');
          this._router.navigate(['/', country, locale, 'auth', 'login']);
          return false;
        }
      } catch (error) {
        console.error('❌ AuthGuard: Error al decodificar token', error);
        this._router.navigate(['/', country, locale, 'auth', 'login']);
        return false;
      }

      return true;
  }
}
