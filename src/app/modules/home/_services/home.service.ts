import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class HomeService {

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    public _http: HttpClient
  ) { }

  listHome(TIME_NOW:any = "") {

    // Inicia el loading
    this.loadingSubject.next(true);
    let URL = URL_SERVICE+"home/list?TIME_NOW="+TIME_NOW;
    //return this._http.get(URL);
    return this._http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando termina la llamada
    );
    
  }
}
