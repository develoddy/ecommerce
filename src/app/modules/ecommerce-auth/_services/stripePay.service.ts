import { Injectable } from '@angular/core';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { catchError, finalize, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class StripePayService {
    constructor(
        public _authService: AuthService,
        public _http: HttpClient,
    ) { }
  
    createStripeSession(data:any) {
        let headers = new HttpHeaders({
            'token': this._authService.token
        });

        let URL = URL_SERVICE+"stripe/create-checkout-session";

        return this._http.post(URL, data, {headers: headers});
    }

}