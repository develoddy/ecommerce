import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class EcommerceGuestService {

  constructor(
    public _http: HttpClient
  ) { }

  showLandingProduct(slug:string, discount_id:any=null) {
    let LINK = "";
    if (discount_id) {
      LINK = "?_id="+discount_id;
    }
    let URL = URL_SERVICE+"home/show_landing_product/"+slug+LINK;
    return this._http.get(URL);
  }
}
