import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URL_SERVICE } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EcommerceGuestService {

  constructor(
    public _http: HttpClient,
    public _authService: AuthService,
  ) { }

  showLandingProduct(slug:string, discount_id:any=null) {
    let LINK = "";
    if (discount_id) {
      LINK = "?_id="+discount_id;
    }
    let URL = URL_SERVICE+"home/show_landing_product/"+slug+LINK;
    return this._http.get(URL);
  }

  configInitial() {
    let URL = URL_SERVICE+"home/config_initial/";
    return this._http.get(URL);
  }

  filterProduct(data:any) {
    let TIME_NOW = new Date().getTime();
    let URL = URL_SERVICE+"home/filters_products?TIME_NOW="+TIME_NOW;
    return this._http.post(URL, data);
  }
}
