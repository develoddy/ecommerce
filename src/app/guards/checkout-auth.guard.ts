import { Injectable } from '@angular/core';
import {
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { Observable, combineLatest, of } from 'rxjs';
import { take, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CheckoutAuthGuard implements CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return combineLatest([this.auth.user, this.auth.userGuest]).pipe(
      take(1),
      map(([user, guest]) => {
        if (user) {
          return true;
        }
        if (guest && guest.state === 1) {
          return true;
        }
    // No hay usuario ni invitado: extraer country/locale desde state.url y redirigir a login
    const segments = state.url.split('/');
    const country = segments[1] || '';
    const locale = segments[2] || '';
    return this.router.parseUrl(`/${country}/${locale}/account/checkout/login`);
      })
    );
  }
}