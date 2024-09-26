import { Injectable } from '@angular/core';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EcommerceAuthService {

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    public _authService: AuthService,
    public _http: HttpClient,
  ) { }

  // ADDRESS FROM CLIENT
  
  listAddressClient(user_id:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/list?user_id="+user_id;
    //return this._http.get(URL, {headers: headers});
    
    // Realizamos la petición HTTP
    return this._http.get(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  registerAddressClient(data:any) {
    // Inicia el loading
    this.loadingSubject.next(true);

    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/register";
    // return this._http.post(URL, data, {headers: headers});

    return this._http.post(URL, data, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  updateAddressClient(data:any) {
     // Inicia el loading
     this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/update";
    //return this._http.put(URL, data, {headers: headers});

    return this._http.put(URL, data, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  deleteAddressClient(address_cliente_id:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/delete/"+address_cliente_id;
    //return this._http.delete(URL, {headers: headers});
    return this._http.delete(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }
  // END SERVICE

  registerSale(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"sale/register";
    return this._http.post(URL, data, {headers: headers});
  }

  //
  showProfileClient(data:any) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"home/profile_client";
    //return this._http.post(URL, data, {headers: headers});
    return this._http.post(URL, data, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  updateProfileClient(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"home/update_client";
    return this._http.post(URL, data, {headers: headers});
  }

  // REVIEW
  registerProfileClientReview(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"review/register";
    return this._http.post(URL, data, {headers: headers});
  }

  updateProfileClientReview(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"review/update";
    return this._http.put(URL, data, {headers: headers});
  }

  detail_user(data:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"users/detail_user";
    return this._http.post(URL, data, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

}
