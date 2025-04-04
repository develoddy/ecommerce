import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, switchMap, catchError, tap, filter, throwError, take } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private accessTokenSubject = new BehaviorSubject<string | null>(sessionStorage.getItem('access_token'));
  private refreshTokenSubject = new BehaviorSubject<string | null>(sessionStorage.getItem('refresh_token'));
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
      sessionStorage.setItem('access_token', token);
    } else {
      sessionStorage.removeItem('access_token');
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
      sessionStorage.setItem('refresh_token', token);
    } else {
      sessionStorage.removeItem('refresh_token');
    }
  }

handleLogout(): void {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    this._router.navigateByUrl(`/${country}/${locale}/auth/login`);
  }

   refreshingToken(): Observable<string> {
  
      const refreshToken = sessionStorage.getItem('refresh_token');
      const URL = URL_SERVICE + "users/refresh-token";
  
      if ( !refreshToken ) {
        this.handleLogout();
        return throwError(() => new Error('No refresh token found.'));
      }
      
      if ( !this.isRefreshing ) {
        this.isRefreshing = true;
        this.refreshTokenSubject.next(null); // LIMPIAR EL SUBJECT ANTES DE HACER LA LLAMADA
  
        return this._http.post<any>(URL, { refresh_token: refreshToken }).pipe(
          tap(( response ) => {
            // VERIFICAR SI EL BACKEND AHA RESPONDIDO CON UN REFRESH TOKEN VALIDO
            if ( !response || !response.refreshToken || !response.accessToken) {
              this.handleLogout();
              throw new Error('Invalid refresh response');
              this.isRefreshing = false;
              return;
            }
  
            // DECODIFICAR EL PAYLOAD DEL NUEVO refreshToken PARA VERIFICAR SU EXPIRACION
            const base64Url      = response.refreshToken.split('.')[1];
            const base64         = base64Url.replace('-', '+').replace('_', '/');
            const decodedPayload = JSON.parse(atob(base64));
            // console.log("📌 NUEVO PAYLOAD DEL REFRESH TOKEN:", decodedPayload);
            console.warn("📅 REFRESH TOKEN EXPIRA EN:", new Date(decodedPayload.exp * 1000).toLocaleString());
  
            // GUARDA EL NUEVO accessToken
            this.accessToken = response.accessToken;
            this.refreshToken = response.refreshToken;
            this.isRefreshing = false;
  
          }),
         
          // DEVOLVEMOS EL TOKEN NUEVO
          switchMap(() => 
            this.accessTokenSubject.pipe(
              filter((token): token is string => token !== null), // Filtramos null
              take(1)
            )
          ), // Aquí se asegura de que no haya 'null'

          catchError(( error ) => {
            this.handleLogout();
            this.isRefreshing = false;
            return throwError(() => error); //throw error; // PROPAGAR EL ERROR
          })
        );
      } else {
         // Si ya estamos en el proceso de refrescar el token, esperamos que se complete
         return this.refreshTokenSubject.pipe(
            filter((token): token is string => token !== null),
            take(1)
          );
      }
    }

  // Método para verificar si el token está cerca de expirar
  isTokenNearExpiration(): boolean {
    const token = this.accessToken;
    if (!token) return false;

    const decoded = this.decodeToken(token);
    const expirationDate = decoded.exp * 1000; // Convertir a milisegundos
    const now = Date.now();
    const expirationThreshold = 5 * 60 * 1000; // 5 minutos antes de la expiración
    return expirationDate - now < expirationThreshold;
  }

  private decodeToken(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(atob(base64));
  }
}
