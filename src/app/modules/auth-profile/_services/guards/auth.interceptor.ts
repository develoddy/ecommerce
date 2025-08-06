import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, take, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { Router } from '@angular/router';
import { TokenService } from '../token.service';
//import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private _router: Router, 
    private localizationService: LocalizationService,
    private tokenService: TokenService,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = this.tokenService.accessToken;
    const guestData = localStorage.getItem('user_guest');

    if (accessToken) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return next.handle(clonedRequest).pipe(
        catchError((error) => {
          if (error.status === 401 && !this.tokenService.isRefreshing) {
            // Si el error es de tipo 401, intentar refrescar el token
            return this.tokenService.refreshingToken().pipe(
              switchMap(() => {
                const newAccessToken = this.tokenService.accessToken;
                const clonedRequestWithNewToken = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newAccessToken}`
                  }
                });
                return next.handle(clonedRequestWithNewToken);
              }),
              catchError((refreshError) => {
                this.tokenService.handleLogout();
                return throwError(refreshError);
              })
            );
          }
          return throwError(error);
        })
      );
    } else if (guestData) {
      // Si no hay access token y tenemos datos de guest, agregar ese dato
      const clonedRequest = req.clone({
        setHeaders: {
          'X-Guest-Data': guestData
        }
      });
      return next.handle(clonedRequest);
    } else {
      return next.handle(req);  // Si no hay token, pasar la solicitud sin modificar
    }
  }
}
