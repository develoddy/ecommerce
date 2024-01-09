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

  showLandingProduct(slug:string) {
    let URL = URL_SERVICE+"home/show_landing_product/"+slug;
    return this._http.get(URL);
  }
}
