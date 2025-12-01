import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

declare function alertWarning([]): any;
declare function alertDanger([]): any;

/**
 * Interceptor global para manejo de errores HTTP
 * Este interceptor captura errores que no fueron manejados por los componentes
 * y proporciona una experiencia de usuario consistente
 */
@Injectable()
export class ErrorHandlerInterceptor implements HttpInterceptor {
  
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        
        // Si el error ya fue manejado por el auth.interceptor o el componente,
        // simplemente lo propagamos sin mostrar alertas duplicadas
        
        // Log del error para debugging
        console.error('🌐 ErrorHandlerInterceptor: Error HTTP detectado', {
          url: req.url,
          status: error.status,
          message: error.message
        });

        // Solo mostramos alerta si no hay un handler específico en el componente
        // (esto se puede detectar verificando si el error tiene observers)
        
        // Propagar el error para que el componente pueda manejarlo
        return throwError(() => error);
      })
    );
  }
}
