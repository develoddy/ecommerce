import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, switchMap, catchError, tap, filter, throwError, take, map } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { URL_SERVICE } from 'src/app/config/config';

/**
 * ⏰ SERVICIO DE GESTIÓN DE TOKENS (CONSOLIDADO)
 * 
 * Este servicio centraliza toda la lógica de manejo de tokens JWT.
 * Anteriormente esta lógica estaba duplicada entre auth.service.ts y token.service.ts
 * 
 * ESTRATEGIA DE REFRESH (DUAL):
 * ============================
 * 1. PROACTIVO: Timer en app.component revisa cada 2 minutos si el token está cerca de expirar (< 5 min)
 * 2. REACTIVO: Interceptor detecta errores 401 y refresca automáticamente
 * 
 * CONFIGURACIÓN ACTUAL:
 * ====================
 * - Access Token: 1 día (expiresIn: '1d')
 * - Refresh Token: 30 días (expiresIn: '30d')
 * - Threshold refresh: 5 minutos antes de expirar
 * - Timer proactivo: cada 2 minutos
 * 
 * MEJORAS FUTURAS (POST-LANZAMIENTO):
 * ===================================
 * - FASE 2: Reducir accessToken a 15 minutos + token rotation con BD
 * - FASE 3: Migrar a httpOnly cookies + CSRF protection
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private accessTokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('access_token'));
  private refreshTokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('refresh_token'));
  //private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    isRefreshing = false;
  //refreshTokenInProgress = false;

  constructor(
      private _http: HttpClient,
      private _router: Router,
      private localizationService: LocalizationService
    ) {}

  // Obtener el access token
  get accessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  // Establecer el access token
  set accessToken(token: string | null) {
    this.accessTokenSubject.next(token);
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  // Obtener el refresh token
  get refreshToken(): string | null {
    return this.refreshTokenSubject.value;
  }

  // Establecer el refresh token
  set refreshToken(token: string | null) {
    this.refreshTokenSubject.next(token);
    if (token) {
      localStorage.setItem('refresh_token', token);
    } else {
      localStorage.removeItem('refresh_token');
    }
  }

handleLogout(): void {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this._router.navigateByUrl(`/${country}/${locale}/auth/login`);
  }

   refreshingToken(): Observable<string> {
  
      const refreshToken = localStorage.getItem('refresh_token');
      const URL = URL_SERVICE + "users/refresh-token";
  
      if ( !refreshToken ) {
        console.error('❌ TokenService: No hay refresh token disponible');
        this.handleLogout();
        return throwError(() => new Error('No refresh token found.'));
      }
      
      if ( !this.isRefreshing ) {
        this.isRefreshing = true;
        console.log('🔄 TokenService: Iniciando refresh de tokens...');
  
        return this._http.post<any>(URL, { refresh_token: refreshToken }).pipe(
          // VALIDAR Y PROCESAR RESPUESTA
          map(( response ) => {
            // VERIFICAR SI EL BACKEND HA RESPONDIDO CON UN REFRESH TOKEN VALIDO
            if ( !response || !response.refreshToken || !response.accessToken) {
              console.error('❌ TokenService: Respuesta inválida del servidor');
              throw new Error('Invalid refresh response');
            }
  
            // DECODIFICAR EL PAYLOAD DEL NUEVO refreshToken PARA VERIFICAR SU EXPIRACION
            const base64Url      = response.refreshToken.split('.')[1];
            const base64         = base64Url.replace('-', '+').replace('_', '/');
            const decodedPayload = JSON.parse(atob(base64));
            console.warn("📅 REFRESH TOKEN EXPIRA EN:", new Date(decodedPayload.exp * 1000).toLocaleString());
  
            // RETORNAR LA RESPUESTA COMPLETA PARA EL SIGUIENTE OPERADOR
            return response;
          }),
          
          // GUARDAR TOKENS Y RETORNAR EL ACCESS TOKEN
          tap((response) => {
            // GUARDAR LOS NUEVOS TOKENS EN MEMORIA Y LOCALSTORAGE
            // Los setters ya emiten automáticamente al BehaviorSubject
            this.accessToken = response.accessToken;
            this.refreshToken = response.refreshToken;
            
            console.log('✅ TokenService: Tokens guardados en memoria y localStorage');
            console.log('📤 TokenService: Retornando nuevo access_token al interceptor');
          }),
          
          // RETORNAR SOLO EL ACCESS TOKEN
          map((response) => response.accessToken),
          
          // RESETEAR FLAG EN CASO DE ÉXITO O ERROR
          tap({
            finalize: () => {
              this.isRefreshing = false;
              console.log('🏁 TokenService: Proceso de refresh finalizado');
            }
          }),

          catchError(( error ) => {
            console.error('❌ TokenService: Error en refresh:', error);
            this.isRefreshing = false;
            this.handleLogout();
            return throwError(() => error);
          })
        );
      } else {
         // Si ya estamos en el proceso de refrescar el token, esperamos que se complete
         console.log('⏳ TokenService: Refresh en progreso, esperando...');
         
         // Crear un observable que espera a que isRefreshing sea false
         return new Observable<string>((observer) => {
           const checkInterval = setInterval(() => {
             if (!this.isRefreshing) {
               clearInterval(checkInterval);
               const currentToken = this.accessToken;
               if (currentToken) {
                 console.log('✅ TokenService: Refresh completado, retornando token actualizado');
                 console.log(`🔑 TokenService: Token a retornar (primeros 30 chars): ${currentToken.substring(0, 30)}...`);
                 console.log(`📏 TokenService: Longitud del token: ${currentToken.length}`);
                 observer.next(currentToken);
                 observer.complete();
               } else {
                 console.error('❌ TokenService: No hay access token después del refresh');
                 observer.error(new Error('No access token after refresh'));
               }
             }
           }, 50); // Verificar cada 50ms
         });
      }
    }

  /**
   * Verifica si el token está cerca de expirar (dentro de 5 minutos)
   * @returns true si el token expira en menos de 5 minutos
   * 
   * ⚠️ TESTING MODE ACTIVO: expirationThreshold = 23 horas
   * Para testing del refresh proactivo. Restaurar a 5 minutos después del test.
   */
  isTokenNearExpiration(): boolean {
    const token = this.accessToken;
    if (!token) {
      console.warn('⚠️ No hay access token disponible');
      return false;
    }

    try {
      const decoded = this.decodeToken(token);
      const expirationDate = decoded.exp * 1000; // Convertir a milisegundos
      const now = Date.now();
      const timeRemaining = expirationDate - now;
      
      // 🔧 PRODUCCIÓN: 5 minutos (valor normal)
      // ⚠️ TESTING Caso 2: Cambiar a Infinity para forzar refresh proactivo
      const expirationThreshold = 5 * 60 * 1000; // 5 minutos (PRODUCCIÓN)
      // const expirationThreshold = Infinity; // TESTING: Siempre dispara refresh
      
      // Log detallado del estado del token
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      
      if (timeRemaining < expirationThreshold) {
        console.warn(`⏰ Token expira en ${minutes}m ${seconds}s - Requiere refresh`);
        return true;
      } else {
        console.log(`✅ Token válido por ${minutes}m ${seconds}s`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando expiración del token:', error);
      return false;
    }
  }

  /**
   * Verifica si el token ya expiró
   * @returns true si el token está expirado
   */
  isTokenExpired(): boolean {
    const token = this.accessToken;
    if (!token) return true;

    try {
      const decoded = this.decodeToken(token);
      const expirationDate = decoded.exp * 1000;
      const now = Date.now();
      const isExpired = now >= expirationDate;
      
      if (isExpired) {
        console.error('❌ Token expirado');
      }
      
      return isExpired;
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
      return true;
    }
  }

  /**
   * Obtiene el tiempo restante antes de que expire el token
   * @returns Tiempo en milisegundos, o null si no hay token
   */
  getTimeUntilExpiration(): number | null {
    const token = this.accessToken;
    if (!token) return null;

    try {
      const decoded = this.decodeToken(token);
      const expirationDate = decoded.exp * 1000;
      const now = Date.now();
      return Math.max(0, expirationDate - now);
    } catch (error) {
      return null;
    }
  }

  private decodeToken(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(atob(base64));
  }
}
