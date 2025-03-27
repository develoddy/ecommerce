import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, switchMap, take, filter } from 'rxjs';
import { AuthService } from '../auth.service';
//import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = this.authService.getAccessToken();

    
    
    if (accessToken && this.authService.isTokenNearExpiration(accessToken)) {
    
        // Verificar si el token ha expirado
        this.authService.verifyTokenExpiration(accessToken);

        // Si el token está por expirar, lo renovamos antes de hacer la petición
        return this.authService.refreshToken().pipe(
            //filter(token => token !== null), // Espera a que el token se actualice
            take(1), // Toma solo el primer valor emitido
            switchMap((newToken) => {
            const clonedRequest = req.clone({
                setHeaders: {
                Authorization: `Bearer ${newToken}`
                }
            });
            return next.handle(clonedRequest);
            })
        );
    } else {
      // Si el token aún es válido, simplemente hacer la petición con el token actual
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return next.handle(clonedRequest);
    }
  }
}
