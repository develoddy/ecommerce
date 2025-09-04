import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize, window, Observable, tap, filter, throwError, switchMap, take } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  public accessTokenSubject = new BehaviorSubject<string | null>(this.getAccessToken());
  public accessToken$ = this.accessTokenSubject.asObservable();
  token: any = null;
  public userSubject = new BehaviorSubject<any>(this.getAuthenticatedUser());
  user = this.userSubject.asObservable();
  public userGuestSubject = new BehaviorSubject<any>(this.getGuestUser());
  userGuest = this.userGuestSubject.asObservable();
  
  constructor(
    private _http               : HttpClient, 
    private _router             : Router, 
    private localizationService : LocalizationService
  ) {
    if(!this.isAuthenticatedUser()) {
      this.validateOrCreateGuest();
    }
    this.getLocalStorage();
  }

  /**
   * Valida si el guest de localStorage existe en la base de datos.
   * Si no existe, borra el guest viejo y crea uno nuevo.
   * Si no hay guest, crea uno nuevo.
   */
  validateOrCreateGuest(): void {
    const storedUserGuest = localStorage.getItem("user_guest");
    if (storedUserGuest) {
      const parsedUserGuest = JSON.parse(storedUserGuest);
      // Llama al backend para validar si el guest existe
      this.validateGuestInBackend(parsedUserGuest.session_id).subscribe({
        next: (resp: any) => {
          if (resp && resp.exists) {
            // Guest válido, actualiza el subject
            this.userGuestSubject.next(parsedUserGuest);
          } else {
            // Guest inválido, borra y crea uno nuevo
            this.addGuestLocalStorage(true).subscribe();
          }
        },
        error: () => {
          // Si hay error de red o backend, crea uno nuevo por seguridad
          this.addGuestLocalStorage(true).subscribe();
        }
      });
    } else {
      // No hay guest, crea uno nuevo
      this.addGuestLocalStorage().subscribe();
    }
  }

  /**
   * Llama al backend para validar si el guest existe (debes implementar este endpoint en el backend)
   * @param session_id string
   * @returns Observable<{exists: boolean}>
   */
  validateGuestInBackend(session_id: string): Observable<any> {
    const URL = URL_SERVICE + `guests/validate/${session_id}`;
    return this._http.get<{exists: boolean}>(URL);
  }

  private getAuthenticatedUser(): any {
    const authenticatedUser = localStorage.getItem("user");
    return authenticatedUser ? JSON.parse(authenticatedUser) : null;
  }

  private getGuestUser(): any {
    const guestUser = localStorage.getItem("user_guest");
    return guestUser ? JSON.parse(guestUser) : null;
  }

  isGuestUser(): boolean {
    return this.getGuestUser() !== null;
  }
  
  isAuthenticatedUser(): boolean {
    return this.getAuthenticatedUser() !== null;
  }

  private getLocalStorage() {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem("user");

    if ( storedUser ) {
      this.userSubject.next(JSON.parse(storedUser));
      this.accessTokenSubject.next(token);
      this.token = localStorage.getItem("access_token");
    } else {
      this.token = null;
      this.userSubject.next(null);
    }
  }

  getLocaleAndCountry(): { locale: string, country: string } {
    return {
      locale: this.localizationService.locale,
      country: this.localizationService.country
    };
  }

  public setAccessToken(accessToken:any) {
    localStorage.setItem("access_token", accessToken);
    this.accessTokenSubject.next(accessToken); 
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  login(email: string, password: string) {
    this.loadingSubject.next(true);
    const URL = URL_SERVICE + "users/login";
    return this._http.post( URL, { email, password } ).pipe(
      map(( resp: any ) => {
        if (  
          resp.USER_FRONTED  && 
          resp.USER_FRONTED.accessToken && 
          resp.USER_FRONTED.refreshToken 
        ){
          this.localStorageSave(resp.USER_FRONTED);
          this.removeUserGuestLocalStorage();
          this.deleteGuestAndAddresses();
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
        this.loadingSubject.next(false);

      })
    );
  }

  localStorageSave(USER_FRONTED: any) {
    localStorage.setItem("access_token", USER_FRONTED.accessToken);
    localStorage.setItem("refresh_token", USER_FRONTED.refreshToken);
    localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    this.token = USER_FRONTED.accessToken;
    this.userSubject.next(USER_FRONTED.user);  
  }

  /**
   * Crea un guest en localStorage y backend. Si forceNew es true, borra el guest viejo antes de crear uno nuevo.
   */
  addGuestLocalStorage(forceNew: boolean = false): Observable<any> {
    return new Observable(observer => {
      if (forceNew) {
        localStorage.removeItem("user_guest");
      }
      const storedUserGuest = localStorage.getItem("user_guest");
      if (!storedUserGuest) {
        this.deleteGuestAndAddresses().subscribe({
          next: () => {
            // No guardar aún en localStorage, espera a la respuesta del backend
            const guestData = {
              name: 'Anonymous',
              session_id: this.generateSessionId()
            };
            this.sendGuestDataToBackend(guestData).subscribe({
              next: (resp: any) => {
                // Guarda en localStorage
                localStorage.setItem("user_guest", JSON.stringify(resp.data));
                
                // 🚀 Propaga inmediatamente
                this.userGuestSubject.next(resp.data);

                observer.next(resp.data);
                observer.complete();
              },
              error: (err) => {
                observer.error(err);
              }
            });
          },
          error: (err) => {
            observer.error(err);
          }
        });
      } else {
        const parsedUserGuest = JSON.parse(storedUserGuest);
        this.userGuestSubject.next(parsedUserGuest);
        observer.next(parsedUserGuest);
        observer.complete();
      }
    });
  }

  sendGuestDataToBackend(data: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "guests/register";
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this._http.post(URL, data, { headers }).pipe(
      tap((resp: any) => {
        
        if (resp?.status === 200 && resp?.data) {
          const guestData = {
            _id       : resp.data.id || 0,
            user_guest: "Guest",
            name      : resp.data.name || "Anonymous",
            guest     : false,
            state     : resp.data.state,
            session_id: resp.data.session_id
          };
          localStorage.setItem("user_guest", JSON.stringify(guestData));
          this.userGuestSubject.next(guestData);
        }
      })
    );
  }

  generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);  // Esto llena el array con valores aleatorios
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
        const refreshToken = localStorage.getItem('refresh_token');
        if ( refreshToken ) {

          this.refreshToken().subscribe({
            error: () => {
              // SI FALLA LA RENOVACION, REDIRIGIR AL LOGIN
              const country = this.localizationService.country;
              const locale = this.localizationService.locale;
              this._router.navigateByUrl(`/${country}/${locale}/auth/login`);
            }
          });
        }
      }

    } catch (error) {
      console.error("❌ ERROR AL DECODIFICAR EL TOKEN:", error);
    }
  }

  // OLD
  isTokenNearExpiration(token: string): boolean {
    try {
      // EXTRAER LA PARTE DEL PAYLOAD DEL TOKEN JWT
      const base64Url = token.split('.')[1];
      const base64    = base64Url.replace('-', '+').replace('_', '/');
      const decoded   = JSON.parse(atob(base64));
  
      const exp = decoded.exp;
      const currentTimestamp = Math.floor(Date.now() / 1000); // OBTENER EL TIEMPO ACTUAL EN SEGUNDOS
  
      // DEFINIR EL UMBRAL DE "CERCA DE EXPIRAR" (EN SEGUNDOS, POR EJEMPLO, 5 MINUTOS)
      const expirationThreshold = 5 * 60; // 5 MINUTOS ANTES DE LA EXPIRACIÓN
  
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

  private handleLogout(): void {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this._router.navigateByUrl(`/${country}/${locale}/auth/login`);
  }
  
  refreshToken(): Observable<string> {

    const refreshToken = localStorage.getItem('refresh_token');
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
          localStorage.setItem("access_token", response.accessToken);
          localStorage.setItem('refresh_token', response.refreshToken);
          this.accessTokenSubject.next(response.accessToken); // EMITIMOS NUEVO TOKEN A LOS QUE ESTÁN ESPERANDO
          this.isRefreshing = false;

        }),
        //switchMap(() => this.refreshTokenSubject.pipe(filter(token => token !== null), take(1))), 
        // DEVOLVEMOS EL TOKEN NUEVO
        switchMap(() =>
          this.refreshTokenSubject.pipe(
            filter((token): token is string => token !== null), // 👈 forzamos tipo
            take(1)
          )
        ),
        catchError(( error ) => {
          this.handleLogout();
          this.isRefreshing = false;
          return throwError(() => error); //throw error; // PROPAGAR EL ERROR
        })
      );
    } else {
      //return this.refreshTokenSubject.asObservable();
      // YA SE ESTÁ REFRESCANDO, DEVOLVEMOS EL OBSERVABLE QUE ESPERA EL TOKEN
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null), // 👈 aquí también
        take(1)
      );
    }
  }

  getSessionId(): string | null {
    const guestUser = localStorage.getItem("user_guest");
    return guestUser ? JSON.parse(guestUser).session_id : null;
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem("user");
    localStorage.removeItem("user_guest");
    this.token = null;
    this.userSubject.next(null);
    this.userGuestSubject.next(null);

    /*this.deleteGuestAndAddresses().subscribe({
      next: (resp: any) => {
          localStorage.removeItem("user_guest");
          this.addGuestLocalStorage();
      },
      error: err => {
          console.error("❌ Error al limpiar datos guest al salir del checkout", err);
      }
    });*/
    this.deleteGuestAndAddresses().subscribe({
      next: () => {
        this.addGuestLocalStorage().subscribe({
          next: () => {
            const { country, locale } = this.getLocaleAndCountry();
            this._router.navigate(['/', country, locale, 'home']);
          },
          error: (err) => {
            console.error("❌ Error al crear guest tras logout", err);
          }
        });
      },
      error: (err) => {
        console.error("❌ Error al limpiar datos guest al salir del checkout", err);
      }
    });

    
    //const { country, locale } = this.getLocaleAndCountry();
    //this._router.navigate(['/', country, locale, 'home']);
  }

  deleteGuestAndAddresses(): Observable<any> {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"guests/removeAll";
    return this._http.delete<any>(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  removeUserGuestLocalStorage() {
    localStorage.removeItem("user_guest");
    this.userGuestSubject.next(null);
  }
}