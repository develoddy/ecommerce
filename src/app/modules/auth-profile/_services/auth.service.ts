import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize, window, Observable, tap } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();
  public accessTokenSubject = new BehaviorSubject<string | null>(this.getAccessToken());
  public accessToken$ = this.accessTokenSubject.asObservable();
  token: any = null;

  private userSubject = new BehaviorSubject<any>(this.getStoredUser());
  user = this.userSubject.asObservable(); //private userSubject = new BehaviorSubject<any>(null);

  private userGuestSubject = new BehaviorSubject<any>(null);
  userGuest = this.userGuestSubject.asObservable();
  

  constructor(
    private _http: HttpClient,
    private _router: Router,
    private localizationService: LocalizationService
  ) {
    this.addGuestLocalStorage();
    //const storedUser = sessionStorage.getItem("user"); //const storedUser = localStorage.getItem("user"); 
    //this.userSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
    //this.user = this.userSubject.asObservable();
    this.userGuest = this.userGuestSubject.asObservable();

    this.getLocalStorage();
  }

  private getStoredUser(): any {
    const storedUser = sessionStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  }

  private getLocalStorage() {
    const token = sessionStorage.getItem('access_token');
    const storedUser = sessionStorage.getItem("user");

    if ( storedUser ) {
      this.userSubject.next(JSON.parse(storedUser));
      this.accessTokenSubject.next(token);
      this.token = sessionStorage.getItem("access_token");

    } else {
      this.token = null;
      this.userSubject.next(null);

    }
  }

  // Función para obtener locale y country de LocalizationService
  private getLocaleAndCountry(): { locale: string, country: string } {
    return {
      locale: this.localizationService.locale,
      country: this.localizationService.country
    };
  }

  public setAccessToken(accessToken:any) {
    sessionStorage.setItem("access_token", accessToken);
    this.accessTokenSubject.next(accessToken); // Emitir el nuevo token
  }

  // Método para obtener el token
  public getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  
  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token');
  }

  

  login(email: string, password: string) {

    this.loadingSubject.next(true);

    const URL = URL_SERVICE + "users/login";

    return this._http.post( URL, { email, password } ).pipe(
      map(( resp: any ) => {
        if (  resp.USER_FRONTED             && 
              resp.USER_FRONTED.accessToken && 
              resp.USER_FRONTED.refreshToken 
        ) {

          this.localStorageSave(resp.USER_FRONTED);
          this.removeUserGuestLocalStorage();
          return true;

        } else {
          return resp;
        }

      }),
      catchError(( error: any ) => {
        console.error(error);
        return of(error);

      }),
      finalize(() => {
        // FINALIZA EL LOADING CUANDO TERMINA LA LLAMADA
        this.loadingSubject.next(false);

      })
    );
  }

  /* ------------------ Zona de Token --------------- */
  /*  ¿Qué pasa cuando el Access Token expira?
   *  Usuario inicia sesión → Se generan accessToken (6 min) y refreshToken (30 días).
   *  El usuario usa el accessToken para hacer peticiones al backend.
   *  Cuando el accessToken expira (pasan 6 minutos), el sistema detecta que está vencido.
   *  Se usa el refreshToken para generar un nuevo accessToken.
   *  Este ciclo se repite cada 6 minutos hasta que el refreshToken también expire (30 días).
   *
   *  📌 Importante: El refreshToken NO cambia cada 6 minutos. Solo se usa para obtener un nuevo accessToken.
  */

  verifyTokenExpiration(token: string) {
    try {
  
      // EXTRAER LA PARTE DEL PAYLOAD DEL TOKEN JWT
      const base64Url = token.split('.')[1];
      
      // ASEGURAR QUE LA CADENA BASE64 ESTÉ EN EL FORMATO CORRECTO
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      
      // DECODIFICAR EL TOKEN MANUALMENTE
      const decoded = JSON.parse(atob(base64));
      
      // MOSTRAR LA FECHA DE EMISION (IAT) Y EXPIRACION (EXP) EN FORMATO LEGIBLE
      const iatTimestamp = decoded.iat;
      const expTimestamp = decoded.exp;

      if ( !iatTimestamp || !expTimestamp ) {
        throw new Error("El token no contiene la fecha de emisión (iat) o de expiración (exp).");
      }

      // VERIFICAR SI EL TOKEN HA EXPIRADA
      // OBTENER EL TIEMPO ACTUAL EN SEGUNDOS
      const currentTimestamp = Math.floor(Date.now() / 1000);

      if ( decoded.exp < currentTimestamp ) {  
        // INTENTAR REFRESCAR EL TOKEN SI HAY UN refresh_token DISPONIBLE
        const refreshToken = sessionStorage.getItem('refresh_token');
        if ( refreshToken ) {

          this.refreshToken().subscribe({
            error: () => {
              // SI FALLA LA RENOVACION, REDIRIGIR AL LOGIN
              const { locale, country } = this.getLocaleAndCountry();
              this._router.navigateByUrl(`/${locale}/${country}/auth/login`);
            }
          });
        }
      }

    } catch (error) {
      console.error("❌ ERROR AL DECODIFICAR EL TOKEN:", error);
    }
  }

  isTokenNearExpiration(token: string): boolean {
    try {
      // EXTRAER LA PARTE DEL PAYLOAD DEL TOKEN JWT
      const base64Url = token.split('.')[1];
      const base64    = base64Url.replace('-', '+').replace('_', '/');
      const decoded   = JSON.parse(atob(base64));
  
      const exp = decoded.exp;
      const currentTimestamp = Math.floor(Date.now() / 1000); // OBTENER EL TIEMPO ACTUAL EN SEGUNDOS
  
      // DEFINIR EL UMBRAL DE "CERCA DE EXPIRAR" (EN SEGUNDOS, POR EJEMPLO, 5 MINUTOS)
      const expirationThreshold = 2 * 60; // 2 MINUTOS ANTES DE LA EXPIRACIÓN
  
      // VERIFICAR SI EL TOKEN ESTÁ CERCA DE EXPIRAR
      if (exp - currentTimestamp <= expirationThreshold) {
        return true; // EL TOKEN ESTÁ CERCA DE EXPIRAR
      }
  
      return false; 

    } catch ( error ) {
      const { locale, country } = this.getLocaleAndCountry();
      this._router.navigate(['/', locale, country, 'auth', 'login']);
      return false;
    }
  }
  
  refreshToken(): Observable<any> {

    const refreshToken = sessionStorage.getItem('refresh_token');
    const URL = URL_SERVICE + "users/refresh-token";

    if ( !refreshToken ) {
      const { locale, country } = this.getLocaleAndCountry();
      this._router.navigateByUrl(`/${locale}/${country}/auth/login`);
    }
    
    if ( !this.isRefreshing ) {

      this.isRefreshing = true;
      
      return this._http.post<any>(URL, { refresh_token: refreshToken }).pipe(
        tap(( response ) => {

          // VERIFICAR SI EL BACKEND AHA RESPONDIDO CON UN REFRESH TOKEN VALIDO
          if ( !response || !response.refreshToken ) {
            const { locale, country } = this.getLocaleAndCountry(); 
            this._router.navigateByUrl(`/${locale}/${country}/auth/login`);
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
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
          sessionStorage.setItem("access_token", response.accessToken); 
          this.accessTokenSubject.next(response.accessToken);
          this.isRefreshing = false;

        }),
        catchError(( error ) => {
          const { locale, country } = this.getLocaleAndCountry();
          this._router.navigateByUrl(`/${locale}/${country}/auth/login`);
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          this.isRefreshing = false;
          throw error; // PROPAGAR EL ERROR
        })
      );
    } else {
      return this.refreshTokenSubject.asObservable();
    }
  }

  private localStorageSave(USER_FRONTED: any) {
    sessionStorage.setItem("access_token", USER_FRONTED.accessToken);
    sessionStorage.setItem("refresh_token", USER_FRONTED.refreshToken);
    sessionStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    this.token = USER_FRONTED.accessToken;
    this.userSubject.next(USER_FRONTED.user);  
  }

  private addGuestLocalStorage() {
    const storedUser = sessionStorage.getItem("user");
    if(!storedUser) {
      let data = {
        _id:0,
        user_guest: "Guest",
        guest: true,
      }
      sessionStorage.setItem("user_guest", JSON.stringify(data));
  
      const storedUserGuest = sessionStorage.getItem("user_guest");
      if (storedUserGuest) {
        this.userGuestSubject.next(JSON.parse(storedUserGuest));
      }
    }
  }

  requestPasswordReset(email: string) {
    this.loadingSubject.next(true);
    const URL = URL_SERVICE + "users/request-reset-password"; // Ajusta la URL según sea necesario
    return this._http.post(URL, { email }).pipe(
      map((response: any) => {
        // Manejar la respuesta aquí si es necesario
        return response; // Puedes devolver una respuesta significativa
      }),
      catchError((error: any) => {
        console.error(error);
        return of(error); // Manejo de errores
      }),
      finalize(() => {
        this.loadingSubject.next(false); // Finaliza el loading
      })
    );
  }

  resetPassword(token: string, newPassword: string) {
    this.loadingSubject.next(true);
    const URL = URL_SERVICE + "users/reset-password";
    return this._http.post(URL, { token, newPassword  }).pipe(
      map((resp: any) => {
        return resp; // Maneja la respuesta según lo que devuelva tu API
      }),
      catchError((error: any) => {
        console.error(error);
        return of(error); // Maneja errores
      }),
      finalize(() => {
        this.loadingSubject.next(false); // Finaliza el loading
      })
    );
  }

  register(data:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "users/register";
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  logout() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem("user");
    this.token = null;
    this.userSubject.next(null);

    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) {
      this.addGuestLocalStorage();
    }
    this._router.navigate(["/"]);
  }

  removeUserGuestLocalStorage() {
    sessionStorage.removeItem("user_guest");
    this.userGuestSubject.next(null);
  }
  
}
