import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, take, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { Router } from '@angular/router';
//import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private _router: Router, private localizationService: LocalizationService ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const accessToken = this.authService.getAccessToken();

    if ( accessToken && this.authService.isTokenNearExpiration(accessToken) ) {
    
        // VERIFICAR SI EL TOKEN HA EXPIRADO
        this.authService.verifyTokenExpiration(accessToken);

        // SI EL TOKEN ESTÁ POR EXPIRAR, LO RENOVAMOS ANTES DE HACER LA PETICIÓN
        return this.authService.refreshToken().pipe(
            take(1), // TOMA EL PRIMER VALOR EMITIDO
            switchMap((newToken) => {
              const clonedRequest = req.clone({
                  setHeaders: {
                  Authorization: `Bearer ${newToken}`
                  }
              });
              return next.handle(clonedRequest);
            }),
            catchError(( error ) => {
              this.authService.logout();
              const locale = this.localizationService.locale;
              const country = this.localizationService.country;
              this._router.navigate(['/', locale, country, 'auth', 'login']);
              return throwError(() => new Error('🚨 EL SEGUNDO REFRESH TOKEN HA EXPIRADO.'));
            })
        );

    } else {

      const clonedRequest = req.clone({
        setHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      });

      return next.handle(clonedRequest);
    }
  }
}
