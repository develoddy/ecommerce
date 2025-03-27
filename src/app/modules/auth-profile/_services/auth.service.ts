import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize, window, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  private userSubject = new BehaviorSubject<any>(null);
  user = this.userSubject.asObservable();

  private userGuestSubject = new BehaviorSubject<any>(null);
  userGuest = this.userGuestSubject.asObservable();
  token: any = null;

  public accessTokenSubject = new BehaviorSubject<string | null>(this.getAccessToken());
  public accessToken$ = this.accessTokenSubject.asObservable();

  constructor(
    private _http: HttpClient,
    private _router: Router
  ) {
    this.addGuestLocalStorage();
    const storedUser = localStorage.getItem("user"); 
    this.userSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
    this.user = this.userSubject.asObservable();
    this.userGuest = this.userGuestSubject.asObservable();

    this.getLocalStorage();
  }

  public setAccessToken(accessToken:any) {
    localStorage.setItem("access_token", accessToken);
    this.accessTokenSubject.next(accessToken); // Emitir el nuevo token
  }

  // Método para obtener el token
  public getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

   // Obtener el refresh token (si lo usas)
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  

  private getLocalStorage() {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      this.userSubject.next(JSON.parse(storedUser));
      this.accessTokenSubject.next(token);
      this.token = localStorage.getItem("access_token"); //this.token = localStorage.getItem("token");
    } else {
      this.token = null;
      this.userSubject.next(null);
    }
  }

  login(email: string, password: string) {
    this.loadingSubject.next(true);
    const URL = URL_SERVICE + "users/login";
    return this._http.post(URL, { email, password }).pipe(
      map((resp: any) => {
        if (resp.USER_FRONTED && resp.USER_FRONTED.accessToken && resp.USER_FRONTED.refreshToken) {
          this.localStorageSave(resp.USER_FRONTED);
          this.removeUserGuestLocalStorage();
          return true;
        } else {
          return resp;
        }
      }),
      catchError((error: any) => {
        console.error(error);
        return of(error);
      }),
      finalize(() => {
        // Finaliza el loading cuando termina la llamada
        this.loadingSubject.next(false);
      })
    );
  }

  // Manejar la expiración del token
  handleTokenExpiration(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.refreshToken();
    } else {
      // Si no tienes un refresh token, redirigir al login
      this._router.navigate(['/auth/login']);
    }
  }

  verifyTokenExpiration(token: string) {
    try {
      // Extraer la parte del payload del token JWT
      const base64Url = token.split('.')[1];
      
      // Asegurar que la cadena base64 esté en el formato correcto
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      
      // Decodificar el token manualmente
      const decoded = JSON.parse(atob(base64));
      // Mostrar la fecha de emisión (iat) y expiración (exp) en formato legible
      const iatTimestamp = decoded.iat;
      const expTimestamp = decoded.exp;

      if (!iatTimestamp || !expTimestamp) {
        throw new Error("El token no contiene la fecha de emisión (iat) o de expiración (exp).");
      }

      const iatDate = new Date(iatTimestamp * 1000);  // Convertir a milisegundos
      const expDate = new Date(expTimestamp * 1000);  // Convertir a milisegundos
      console.log("------------------------------------------------ T O K E N -------------------------------------------------------");
      console.log("FECHA DE EMISION DEL TOKEN (IAT) --------------> ", iatDate.toLocaleString()); // Fecha de emisión
      console.log("FECHA DE VENCIMIENTO DEL TOKEN (EXP) ----------> ", expDate.toLocaleString()); // Fecha de expiración
      console.log("DECODED TOKEN: ", decoded);
      console.log("--------------------------------------------------------------------------------------------------------------");

      // Verificar si el token ya ha expirado
      const currentTimestamp = Math.floor(Date.now() / 1000); // Obtener el tiempo actual en segundos
      if (decoded.exp < currentTimestamp) {
        console.log("EL access_token HA EXPIRADO ❌");
        console.log("--------------------------------------------------------------------------------------------------------------");
      } else {
        console.log("EL access_token SIGUE SIENDO VALIDO ✅");
        console.log("--------------------------------------------------------------------------------------------------------------");
      }
    } catch (error) {
      console.error("ERROR AL DECODIFICAR EL TOKEN ❌:", error);
    }
  }


  isTokenNearExpiration(token: string): boolean {
    try {
      // Extraer la parte del payload del token JWT
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      const decoded = JSON.parse(atob(base64));
  
      const exp = decoded.exp;
      const currentTimestamp = Math.floor(Date.now() / 1000); // Obtener el tiempo actual en segundos
  
      // Definir el umbral de "cerca de expirar" (en segundos, por ejemplo, 5 minutos)
      const expirationThreshold = 5 * 60; // 5 minutos antes de la expiración
  
      // Verificar si el token está cerca de expirar
      if (exp - currentTimestamp <= expirationThreshold) {
        console.log('EL TOKEN ESTÁ CERCA DE EXPIRAR. QUEDAN MENOS DE 5 MINUTOS ⚠️');
        console.log("--------------------------------------------------------------------------------------------------------------");
        return true; // El token está cerca de expirar
      }
  
      return false; // El token no está cerca de expirar
    } catch (error) {
      console.error("Error al verificar la expiración del token:", error);
      return false;
    }
  }
  
  public refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    const URL = URL_SERVICE + "users/refresh-token";
    
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      
      return this._http.post<any>(URL, { refresh_token: refreshToken }).pipe(
        tap((response) => {
          this.setAccessToken(response.accessToken); // Guardar el nuevo accessToken
          this.accessTokenSubject.next(response.accessToken); // Emitir el nuevo token
          this.refreshTokenSubject.next(response.accessToken);
          this.isRefreshing = false;
        }),
        catchError((error) => {
          console.error("Error al renovar el token:", error);
          // Si hay un error al renovar el token, redirigir al login
          this._router.navigate(['/auth/login']);
          throw error; // Propagar el error si es necesario para el manejo posterior
        })
      );
    } else {
      return this.refreshTokenSubject.asObservable();
    }
  }


  private localStorageSave(USER_FRONTED: any) {
    localStorage.setItem("access_token", USER_FRONTED.accessToken); // localStorage.setItem("token", USER_FRONTED.token);
    localStorage.setItem("refresh_token", USER_FRONTED.refreshToken);
    localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    this.token = USER_FRONTED.accessToken;
    this.userSubject.next(USER_FRONTED.user);  // Emitir el nuevo estado del usuario
  }

  private addGuestLocalStorage() {
    const storedUser = localStorage.getItem("user");
    if(!storedUser) {
      let data = {
        _id:0,
        user_guest: "Guest",
        guest: true,
      }
      localStorage.setItem("user_guest", JSON.stringify(data));
  
      const storedUserGuest = localStorage.getItem("user_guest");
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
    //localStorage.removeItem("token");
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem("user");
    this.token = null;
    this.userSubject.next(null);

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      this.addGuestLocalStorage();
    }
    this._router.navigate(["/"]);
  }

  removeUserGuestLocalStorage() {
    localStorage.removeItem("user_guest");
    this.userGuestSubject.next(null);
  }

  
}
