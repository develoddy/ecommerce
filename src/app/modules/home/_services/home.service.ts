import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class HomeService {

  constructor(
    public _http: HttpClient
  ) { }

  listHome(TIME_NOW:any = "") {
    let URL = URL_SERVICE+"home/list?TIME_NOW="+TIME_NOW;
    return this._http.get(URL);
  }
}
