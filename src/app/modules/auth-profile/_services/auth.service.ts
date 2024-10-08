import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject, finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  private userSubject = new BehaviorSubject<any>(null);
  user= this.userSubject.asObservable();
  token: any = null;

  constructor(
    private _http: HttpClient,
    private _router: Router
  ) {
    
    const storedUser = localStorage.getItem("user"); 
    this.userSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
    this.user = this.userSubject.asObservable();

    this.getLocalStorage();
  }



    private getLocalStorage() {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        this.userSubject.next(JSON.parse(storedUser));
        this.token = localStorage.getItem("token");
      } else {
        this.token = null;
        this.userSubject.next(null);
      }
    }


    login(email: string, password: string) {

      // Inicia el loading
      this.loadingSubject.next(true);

      const URL = URL_SERVICE + "users/login";
      return this._http.post(URL, { email, password }).pipe(
        map((resp: any) => {
          if (resp.USER_FRONTED && resp.USER_FRONTED.token) {
            this.localStorageSave(resp.USER_FRONTED);
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



    private localStorageSave(USER_FRONTED: any) {
      localStorage.setItem("token", USER_FRONTED.token);
      localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
      this.token = USER_FRONTED.token;
      this.userSubject.next(USER_FRONTED.user);  // Emitir el nuevo estado del usuario
    }

  register(data:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "users/register";
    //return this._http.post(URL, data);
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }



    logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      this.token = null;
      this.userSubject.next(null);  // Emitir null para indicar que el usuario ha cerrado sesión
      //this._router.navigate(["/auth/login"]);

      this._router.navigate(["/"]);
    }
}
