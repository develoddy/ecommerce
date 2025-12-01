import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, take, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
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
          if (error.status === 401) {
            console.warn('🔍 Interceptor: Error 401 detectado - Token inválido o expirado');
            console.log('🔄 Interceptor: Iniciando refresh de token...');
            
            // El tokenService.refreshingToken() ya maneja el flag isRefreshing internamente
            return this.tokenService.refreshingToken().pipe(
              catchError((refreshError) => {
                // Solo atrapar errores del REFRESH, no del reintento
                console.error('❌ Interceptor: Error al refrescar token - Ejecutando logout automático');
                console.error(`🔍 Interceptor: Tipo de error: ${refreshError.constructor.name}`);
                console.error(`📊 Interceptor: Status: ${refreshError.status || 'N/A'}`);
                this.tokenService.handleLogout();
                return throwError(() => refreshError);
              }),
              switchMap((newToken) => {
                // Obtener el token actualizado del servicio
                const freshAccessToken = this.tokenService.accessToken;
                console.log('✅ Interceptor: Token refrescado exitosamente');
                console.log('🔁 Interceptor: Reintentando request original');
                console.log(`📝 Interceptor: Token recibido de refreshingToken (primeros 30): ${newToken?.substring(0, 30)}...`);
                console.log(`🔑 Interceptor: Token del getter accessToken (primeros 30): ${freshAccessToken?.substring(0, 30)}...`);
                console.log(`🎯 Interceptor: URL del request: ${req.url}`);
                console.log(`⚖️  Interceptor: ¿Tokens coinciden?: ${newToken === freshAccessToken}`);
                
                // Clonar la request ORIGINAL y actualizar solo el header de Authorization
                const clonedRequestWithNewToken = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${freshAccessToken}`
                  }
                });
                
                console.log('🚀 Interceptor: Enviando request clonado con nuevo token...');
                // ⚠️ IMPORTANTE: NO usar catchError aquí - dejar que errores del reintento se propaguen
                return next.handle(clonedRequestWithNewToken).pipe(
                  tap({
                    next: (response) => {
                      console.log(`✅ Interceptor: Request reintentado con ÉXITO para ${req.url}`);
                    },
                    error: (retryError) => {
                      console.error(`⚠️ Interceptor: Request reintentado FALLÓ para ${req.url}`);
                      console.error(`📊 Interceptor: Status del error: ${retryError.status}`);
                      console.error(`📋 Interceptor: Mensaje: ${retryError.message || 'Sin mensaje'}`);
                      console.warn('⚠️ Interceptor: Error del reintento se propaga al componente (NO ejecuta logout)');
                    }
                  })
                );
              })
            );
          }
          return throwError(() => error);
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
