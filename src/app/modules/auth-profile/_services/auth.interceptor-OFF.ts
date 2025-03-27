import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Ajusta la ruta según tu estructura

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private refreshingToken = false; // Variable de control para evitar solicitudes duplicadas

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Agregar el token de autenticación a las solicitudes
    const authToken = this.authService.getAccessToken(); // Asumiendo que tienes un método para obtener el token
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });

  
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el token ha expirado (errores 401), intentar refrescarlo
        if (error.status === 401 && !this.refreshingToken) {
          this.refreshingToken = true; // Marca que se está renovando el token

          return this.authService.refreshToken().pipe(
            take(1), // Solo tomamos la primera emisión del observable

            switchMap((newToken: any) => {
              // Guarda el nuevo token y reintenta la solicitud original con el nuevo token
              this.authService.setAccessToken(newToken.accessToken);

              // Volver a obtener el token actualizado
              // const updatedAuthToken = this.authService.getAccessToken();

              // Reintentar la solicitud con el nuevo token
              const clonedRequestWithNewToken = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken.accessToken}`
                }
              });

              this.refreshingToken = false; // Marca que la renovación del token ha finalizado
              return next.handle(clonedRequestWithNewToken);
            })
          );
        }

        this.refreshingToken = false; // Si no hubo error 401, reseteamos la bandera

        return throwError(error);
      })
    );
  }
}
