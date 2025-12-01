import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize, window, Observable, tap, filter, throwError, switchMap, take } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { TokenService } from './token.service';

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
    private localizationService : LocalizationService,
    private tokenService        : TokenService
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
          // ⚠️ NO borrar user_guest aquí - lo maneja login.component.ts DESPUÉS de migrar el carrito
          // this.removeUserGuestLocalStorage();  // REMOVIDO
          // this.deleteGuestAndAddresses();       // REMOVIDO
          return resp;  // ✅ Retornar resp completa en lugar de true
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
  /*  NOTA: La lógica de tokens ha sido consolidada en token.service.ts
   *  Usa tokenService para:
   *  - refreshingToken(): Renovar tokens
   *  - isTokenNearExpiration(): Verificar si está cerca de expirar
   *  - isTokenExpired(): Verificar si ya expiró
   *  - getTimeUntilExpiration(): Obtener tiempo restante
   */

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