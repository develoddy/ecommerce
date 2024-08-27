import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient} from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { catchError, map, of, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

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

  /*getLocalStorage() {
    if (localStorage.getItem("token")) {
      this.token = localStorage.getItem("token");
      this.user = JSON.parse(localStorage.getItem("user") ?? '');
    } else {
      this.token = null;
      this.user = null;
    }
  }*/

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

  /*login(email: string, password: string) {
    let URL = URL_SERVICE + "users/login";
    return this._http.post(URL, {email, password}).pipe(
      map( (resp:any) => {
        if (resp.USER_FRONTED && resp.USER_FRONTED.token) {
          // ALMACENAR EL TOKEN EN EL LOCALSTORAGE
          return this.localStorageSave(resp.USER_FRONTED)
        } else {
          // DEVUELVE EL STATUS
          return resp;
        }
      }),
      catchError((erro:any) => {
        console.log(erro);
        return of(erro);
      })
    )
  }*/

    login(email: string, password: string) {
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
        })
      );
    }

  /*localStorageSave(USER_FRONTED:any) {
    localStorage.setItem("token", USER_FRONTED.token);
    localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    return true;
  }*/

    private localStorageSave(USER_FRONTED: any) {
      localStorage.setItem("token", USER_FRONTED.token);
      localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
      this.token = USER_FRONTED.token;
      this.userSubject.next(USER_FRONTED.user);  // Emitir el nuevo estado del usuario
    }

  register(data:any) {
    let URL = URL_SERVICE + "users/register";
    return this._http.post(URL, data);
  }

  /*logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    //this._router.navigate(["auth/login"]);
    location.reload();
  }*/

    logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      this.token = null;
      this.userSubject.next(null);  // Emitir null para indicar que el usuario ha cerrado sesión
      //this._router.navigate(["/auth/login"]);
    }
}
