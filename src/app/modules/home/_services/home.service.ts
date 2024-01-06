import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URL_SERVICE } from 'src/app/config/config'

@Injectable({
  providedIn: 'root'
})
export class HomeService {

  constructor(
    public _http: HttpClient
  ) { }

  listHome() {
    let URL = URL_SERVICE+"/home/list";
    return this._http.get(URL);
  }
}
