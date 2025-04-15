import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize, window, Observable, tap, filter, throwError, switchMap, take } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { GuestCleanupService } from '../../ecommerce-guest/_service/guestCleanup.service';
import { EcommerceAuthService } from '../../ecommerce-auth/_services/ecommerce-auth.service';


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
  public userSubject = new BehaviorSubject<any>(this.getAuthenticatedUser());
  user = this.userSubject.asObservable();
  public userGuestSubject = new BehaviorSubject<any>(this.getGuestUser());
  userGuest = this.userGuestSubject.asObservable();
  
  constructor(
    private _http: HttpClient,
    private _router: Router,
    private localizationService: LocalizationService,
     //private authEcommerce: EcommerceAuthService,
  ) {
    this.addGuestLocalStorage();
    this.getLocalStorage();
  }

  private getAuthenticatedUser(): any {
    const authenticatedUser = sessionStorage.getItem("user");
    return authenticatedUser ? JSON.parse(authenticatedUser) : null;
  }

  private getGuestUser(): any {
    const guestUser = sessionStorage.getItem("user_guest");
    return guestUser ? JSON.parse(guestUser) : null;
  }

  isGuestUser(): boolean {
    return this.getGuestUser() !== null;
  }
  
  isAuthenticatedUser(): boolean {
    return this.getAuthenticatedUser() !== null;
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

  // FUNCION PARA OBTENER EL COUNTRY Y LOCALE DE LOCALIZATIONSERVICE
  getLocaleAndCountry(): { locale: string, country: string } {
    return {
      locale: this.localizationService.locale,
      country: this.localizationService.country
    };
  }

  public setAccessToken(accessToken:any) {
    sessionStorage.setItem("access_token", accessToken);
    this.accessTokenSubject.next(accessToken); // Emitir el nuevo token
  }

  // METODO PARA OBTENER EL TOKEN
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
        if (  resp.USER_FRONTED  && resp.USER_FRONTED.accessToken && resp.USER_FRONTED.refreshToken ) {
          this.localStorageSave(resp.USER_FRONTED);
          this.removeUserGuestLocalStorage();
          // this.deleteGuestAndAddresses().subscribe({
          //   next: (resp: any) => {
          //     this.removeUserGuestLocalStorage();
          //   },
          //   error: err => {
          //       console.error("❌ Error al limpiar datos guest al salir del checkout", err);
          //   }
          // });
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

  localStorageSave(USER_FRONTED: any) {
    sessionStorage.setItem("access_token", USER_FRONTED.accessToken);
    sessionStorage.setItem("refresh_token", USER_FRONTED.refreshToken);
    sessionStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    this.token = USER_FRONTED.accessToken;
    this.userSubject.next(USER_FRONTED.user);  
  }

  /* ------------------ ZONA DE GUESTS --------------- */
  /* Generar un ID único para guardar en usuarios guests en session storage
   * y posteriomente guardarlo en la base de datos en la tabla guest
   */
  addGuestLocalStorage() {
    
    const storedUser = sessionStorage.getItem("user");
    const storedUserGuest = sessionStorage.getItem("user_guest");
    if(!storedUserGuest) {
      let data = {
        _id:0,
        user_guest: "Guest",
        name: 'Anonymous',
        guest: false,
        session_id: this.generateSessionId(), // Usamos la función generateUniqueId() en lugar de uuidv4()
      }
      sessionStorage.setItem("user_guest", JSON.stringify(data));
      this.userGuestSubject.next(data);

      // Solo enviar al backend 'name' y 'session_id'
      const guestData = {
        name: data.name,
        session_id: data.session_id
      };
      // Enviar datos al backend (por ejemplo, POST request)
      this.sendGuestDataToBackend(guestData);
   
    } else {
        // Si ya existe, lo mantiene como está
        const parsedUserGuest = JSON.parse(storedUserGuest);
        this.userGuestSubject.next(parsedUserGuest);
    }
  }

  sendGuestDataToBackend(data:any) {

    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "guests/register";

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
     return this._http.post(URL, data, { headers }).subscribe({
       next: (resp: any) => {
        if (resp?.status === 200 && resp?.data) {
          const guestData = {
            _id: resp.data.id || 0,
            user_guest: "Guest",
            name: resp.data.name || "Anonymous",
            guest: false,
            state: resp.data.state,
            session_id: resp.data.session_id
          };
  
          // ✅ Guardar en sessionStorage
          sessionStorage.setItem("user_guest", JSON.stringify(guestData));
  
          // ✅ Notificar al observable
          this.userGuestSubject.next(guestData);
        }
      },

      error: (err) => {
        console.error("❌ Error al registrar el invitado:", err);
      },
      complete: () => {
        console.log("Llamada completada");
      }
     });
  }

  // FUNCION PARA GENERAR UN ID ÚNICO SIMILIAR A UUID
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
        const refreshToken = sessionStorage.getItem('refresh_token');
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
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    this._router.navigateByUrl(`/${country}/${locale}/auth/login`);
  }
  
  refreshToken(): Observable<string> {

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
          sessionStorage.setItem("access_token", response.accessToken);
          sessionStorage.setItem('refresh_token', response.refreshToken);
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
    const guestUser = sessionStorage.getItem("user_guest");
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
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("user_guest");
    this.token = null;
    this.userSubject.next(null);
    this.userGuestSubject.next(null);

    this.deleteGuestAndAddresses().subscribe({
      next: (resp: any) => {
          sessionStorage.removeItem("user_guest");
          this.addGuestLocalStorage();
      },
      error: err => {
          console.error("❌ Error al limpiar datos guest al salir del checkout", err);
      }
    });
    
    const { country, locale } = this.getLocaleAndCountry();
    this._router.navigate(['/', country, locale, 'home']);
  }

  deleteGuestAndAddresses(): Observable<any> {
    
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"guests/removeAll";
    return this._http.delete<any>(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  removeUserGuestLocalStorage() {
    sessionStorage.removeItem("user_guest");
    this.userGuestSubject.next(null);
  }
}


