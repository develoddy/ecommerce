import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URL_SERVICE } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { BehaviorSubject, finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EcommerceGuestService {

  
  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    public _http: HttpClient,
    public _authService: AuthService,
  ) { }

  showLandingProduct(slug:string, discount_id:any=null) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let LINK = "";
    if (discount_id) {
      LINK = "?_id="+discount_id;
    }
    let URL = URL_SERVICE+"home/show_landing_product/"+slug+LINK;
    //return this._http.get(URL);
    return this._http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando termina la llamada
    );
  }

  configInitial() {
     // Inicia el loading
     this.loadingSubject.next(true);
    let URL = URL_SERVICE+"home/config_initial/";
    //return this._http.get(URL);

    return this._http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando termina la llamada
    );
  }

  filterProduct(data:any) {
    // Inicia el loading
    this.loadingSubject.next(true);
    let TIME_NOW = new Date().getTime();
    let URL = URL_SERVICE+"home/filters_products?TIME_NOW="+TIME_NOW;
    //return this._http.post(URL, data);

    // Realiza la solicitud HTTP y maneja el estado de carga
    return this._http.post(URL, data).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando termina la llamada
    );
    
  }
}
