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
  user = this.userSubject.asObservable();

  private userGuestSubject = new BehaviorSubject<any>(null);
  userGuest = this.userGuestSubject.asObservable();
  token: any = null;

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
    this.loadingSubject.next(true);
    const URL = URL_SERVICE + "users/login";
    return this._http.post(URL, { email, password }).pipe(
      map((resp: any) => {
        if (resp.USER_FRONTED && resp.USER_FRONTED.token) {
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

  private localStorageSave(USER_FRONTED: any) {
    localStorage.setItem("token", USER_FRONTED.token);
    localStorage.setItem("user", JSON.stringify(USER_FRONTED.user));
    this.token = USER_FRONTED.token;
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


  register(data:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE + "users/register";
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  logout() {
    localStorage.removeItem("token");
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
