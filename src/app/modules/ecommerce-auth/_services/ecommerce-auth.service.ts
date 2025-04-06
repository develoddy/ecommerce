import { Injectable } from '@angular/core';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { catchError, finalize, of } from 'rxjs';

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

  // ---------- GUESTS -----------------
  deleteGuestAndAddresses() {

    console.log("---> Ecommerce-auth ejecuta, deleteGuestAndAddresses");
    
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"guests/removeAll";
    return this._http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false)),
      catchError((error) => {
        console.error("Error al eliminar los datos del invitado:", error);
        return of(null); // Devuelve un observable vacío si hay error
      }),
      finalize(() => {
        this.loadingSubject.next(false);
        console.log("Finalizando la solicitud.");
      })
    );
  }
  // ------------- END GUESTS ------------


  
  // ------------- ADDRESS FRONT CLIENTE GUEST ------------
  registerAddressGuest(data:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"address_guest/register";
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  listAddressGuest() {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"address_guest/list";
    return this._http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  listOneAdessGuest(idGuest:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"address_guest/listone?guest_id="+idGuest;
    return this._http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  updateAddressGuest(data:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"address_guest/update";
    return this._http.put(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  deleteAddressGuest(address_guest_id:any) {
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"address_guest/delete/"+address_guest_id;
    return this._http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }
  // ------------- END ADDRESS FRONT CLIENTE GUEST ------------


  // ------------- ADDRESS FRONT CLIENTE AUTENTICATED ------------
  
  listAddressClient(user_id:any) {
    this.loadingSubject.next(true);

    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/list?user_id="+user_id;
   
    return this._http.get(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) 
    );
  }

  listOneAdessClient(idAdressClient:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"address_client/listone?id="+idAdressClient;
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
  // ------------- END ADDRESS FRONT CLIENTE AUTENTICATED ------------


  // ------------- SALE FRONT CLIENTE ------------

  registerSale(data:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"sale/register";
    //return this._http.post(URL, data, {headers: headers});
    return this._http.post(URL, data, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  // ------------- END SALE FRONT CLIENTE ------------

  

  // ------------- PROFILE FRONT CLIENTE ------------
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

  // ------------- END PROFILE FRONT CLIENTE ------------

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
