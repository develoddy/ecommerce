import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, switchMap, catchError, tap, filter, throwError, take, map, timeout } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { URL_SERVICE } from 'src/app/config/config';

// Declaraciones de funciones de alerta personalizadas (main.js)
declare function alertDanger(text: string): void;
declare function alertWarning(text: string): void;
declare function alertSuccess(text: string): void;

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

  isRefreshing = false;
  private logoutInProgress = false; // Flag para evitar múltiples logout
  
  // Callback para notificar a AuthService cuando se ejecuta logout
  public onLogoutCallback: (() => void) | null = null;

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

  /**
   * 🚪 LOGOUT COMPLETO (Angular SPA-friendly)
   * 
   * Realiza limpieza completa del estado de autenticación sin romper flujo SPA.
   * 
   * LIMPIEZA EJECUTADA:
   * ==================
   * 1. Tokens de localStorage (access_token, refresh_token)
   * 2. Datos de usuario (user, user_guest)
   * 3. BehaviorSubjects (accessTokenSubject, refreshTokenSubject)
   * 4. AuthService.userSubject (notifica componentes suscritos)
   * 5. Redirección a /auth/login vía Angular Router
   * 
   * ARQUITECTURA:
   * ============
   * - NO usa window.location.href (mantiene SPA sin recarga completa)
   * - Usa Injector para obtener AuthService (evita dependencia circular)
   * - Guards detectan ausencia de tokens y bloquean rutas protegidas
   * - Componentes suscritos a authService.user detectan cambio inmediatamente
   * - Router.navigate() preserva estado de servicios no relacionados con auth
   */
  /**
   * 🚪 LOGOUT COMPLETO (Angular SPA-friendly)
   * 
   * Realiza limpieza completa del estado de autenticación sin romper flujo SPA.
   * Previene loops usando flag logoutInProgress.
   * Muestra notificación al usuario cuando su sesión expira.
   */
  handleLogout(): void {
    // Prevenir múltiples ejecuciones simultáneas
    if (this.logoutInProgress) {
      console.log('⏸️ TokenService: Logout ya en progreso, omitiendo...');
      return;
    }
    
    this.logoutInProgress = true;
    this.isRefreshing = false; // Detener cualquier refresh en progreso
    
    console.log('🚪 TokenService: Ejecutando logout completo (SPA-friendly)');
    
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    
    // 1. Limpiar tokens de localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_guest');
    
    // 2. Limpiar BehaviorSubjects de TokenService (crucial para requests en espera)
    this.accessTokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    
    // 3. Notificar a AuthService usando callback (evita circular dependency)
    if (this.onLogoutCallback) {
      console.log('🔔 TokenService: Notificando a AuthService via callback');
      this.onLogoutCallback();
    } else {
      console.warn('⚠️ TokenService: Callback de logout no registrado');
    }
    
    // 4. 🎨 UX: Notificar al usuario que su sesión expiró
    try {
      alertWarning('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    } catch (error) {
      console.warn('⚠️ No se pudo mostrar notificación de sesión expirada:', error);
    }
    
    // 5. Redirección Angular sin recarga completa
    this._router.navigate(['/', country, locale, 'auth', 'login'])
      .then(() => {
        console.log('✅ Redirección a login completada (SPA preservada)');
        this.logoutInProgress = false; // Reset flag después de navegación
      })
      .catch(err => {
        console.error('❌ Error en redirección, fallback a recarga completa:', err);
        this.logoutInProgress = false;
        window.location.href = `/${country}/${locale}/auth/login`;
      });
  }   refreshingToken(): Observable<string> {
    // ⚠️ CRÍTICO: No intentar refresh si ya estamos en proceso de logout
    if (this.logoutInProgress) {
      console.log('⏸️ TokenService: Logout en progreso, cancelando refresh');
      return throwError(() => new Error('Logout in progress'));
    }
    
    const refreshToken = localStorage.getItem('refresh_token');
    
    // ⚠️ CRÍTICO: Si no hay refresh_token, no intentar refresh
    if (!refreshToken) {
      console.log('❌ TokenService: No hay refresh_token, ejecutando logout');
      this.handleLogout();
      return throwError(() => new Error('No refresh token available'));
    }
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
            
            // ✅ Limpiar tokens del BehaviorSubject para que requests en espera fallen
            this.accessTokenSubject.next(null);
            this.refreshTokenSubject.next(null);
            
            this.handleLogout();
            return throwError(() => error);
          })
        );
      } else {
         // Si ya estamos en el proceso de refrescar el token, esperamos que se complete
         console.log('⏳ TokenService: Refresh en progreso, esperando...');
         
         // Esperar al resultado del refresh principal
         return this.accessTokenSubject.pipe(
           filter((token): token is string => {
             // Solo emitir cuando:
             // 1. El token NO sea null (hay token válido)
             // 2. Y el refresh ya NO esté en progreso (completó exitosamente)
             return token !== null && !this.isRefreshing;
           }),
           take(1),
           tap((token) => {
             console.log('✅ TokenService: Refresh completado, retornando token actualizado');
           }),
           // Si el refresh falla, el BehaviorSubject NO emitirá un token válido
           // y este observable quedará esperando hasta timeout
           timeout({
             each: 10000, // Timeout de 10 segundos
             with: () => throwError(() => new Error('Refresh timeout - posiblemente falló'))
           })
         );
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
