import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { LocalizationService } from '../services/localization.service';

@Injectable({
  providedIn: 'root'
})
export class LocaleGuard implements CanActivate {

  constructor(
    private router: Router,
    private localizationService: LocalizationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const country = route.paramMap.get('country');
    const locale = route.paramMap.get('locale');

    if (
      country &&
      locale &&
      this.localizationService.isValidLocale(country, locale)
    ) {
      return true;
    }

    return this.router.createUrlTree(['/es', 'es']);
  }
}
