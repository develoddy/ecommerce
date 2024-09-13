import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {

  private loadingSubject = new BehaviorSubject<boolean>(false); // Para manejar el estado de carga
  public loading$ = this.loadingSubject.asObservable();

  public wishlist = new BehaviorSubject<Array<any>>([]);
  public currenteDataWishlist$ = this.wishlist.asObservable();
  constructor(
    public _authService: AuthService,
    public _http: HttpClient,
  ) { }

  // ----- WISHLIST ---------

  changeWishlist(WISHLIST:any) {
    let listWishlist = this.wishlist.getValue();
    let INDEX = listWishlist.findIndex((item:any) => item._id == WISHLIST._id);
    if (INDEX != -1) {
      listWishlist[INDEX] = WISHLIST;
    } else {
      listWishlist.unshift(WISHLIST);
    }
    this.wishlist.next(listWishlist);
  }

  resetWishlist() {
    let listCart:any = [];
    this.wishlist.next(listCart);
  }

  listWishlist( user_id:any ) {
    this.loadingSubject.next(true);
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"wishlist/list?user_id="+user_id;
    
    // Retorna la petición HTTP y finaliza el loading al terminar
    return this._http.get(URL, { headers: headers }).pipe(
      finalize(() => this.loadingSubject.next(false)) // Finaliza el loading cuando la llamada termina
    );
  }

  removeItemWishlist(WISHLIST:any) {
    let listWishlist = this.wishlist.getValue();
    let INDEX = listWishlist.findIndex((item:any) => item._id == WISHLIST._id);
    if (INDEX != -1) {
      listWishlist.splice(INDEX, 1);
    }
    this.wishlist.next(listWishlist);
  }

  registerWishlist(data:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"wishlist/register";
    return this._http.post(URL, data, {headers: headers});
  }

  deleteWishlist(wishlist_id:any) {
    let headers = new HttpHeaders({'token': this._authService.token});
    let URL = URL_SERVICE+"wishlist/delete/"+wishlist_id;
    return this._http.delete(URL, {headers: headers});
  }


}
