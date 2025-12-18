import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocalizationService } from './localization.service';

@Injectable({
  providedIn: 'root'
})
export class DynamicRouterService {

  constructor(
    private router: Router,
    private localizationService: LocalizationService
  ) {}

  /**
   * Navega respetando el país e idioma actuales
   * @param path - Array de segmentos de ruta (ej: ['account', 'myaddresses'])
   * @param extras - QueryParams, fragments, etc.
   */
  navigateWithLocale(path: string[], extras?: any) {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    
    const fullPath = ['/', country, locale, ...path];
    
    return this.router.navigate(fullPath, extras);
  }

  /**
   * Genera URL respetando país e idioma actuales
   * @param path - Array de segmentos de ruta
   */
  createUrlWithLocale(path: string[]): string {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    
    return `/${country}/${locale}/${path.join('/')}`;
  }

  /**
   * URLs predefinidas más comunes
   */
  get routes() {
    return {
      home: () => this.navigateWithLocale(['home']),
      login: () => this.navigateWithLocale(['auth', 'login']),
      register: () => this.navigateWithLocale(['auth', 'register']),
      myAccount: () => this.navigateWithLocale(['account', 'my-account']),
      myAddresses: () => this.navigateWithLocale(['account', 'myaddresses']),
      addAddress: () => this.navigateWithLocale(['account', 'myaddresses', 'add']),
      myPurchases: () => this.navigateWithLocale(['account', 'mypurchases']),
      checkout: () => this.navigateWithLocale(['account', 'checkout']),
      shop: () => this.navigateWithLocale(['shop', 'home']),
      
      // URLs como string
      homeUrl: () => this.createUrlWithLocale(['home']),
      loginUrl: () => this.createUrlWithLocale(['auth', 'login']),
      registerUrl: () => this.createUrlWithLocale(['auth', 'register']),
      myAccountUrl: () => this.createUrlWithLocale(['account', 'my-account']),
      myAddressesUrl: () => this.createUrlWithLocale(['account', 'myaddresses']),
      checkoutUrl: () => this.createUrlWithLocale(['account', 'checkout']),
      shopUrl: () => this.createUrlWithLocale(['shop', 'home'])
    };
  }

  /**
   * Genera array de segmentos para routerLink en templates
   */
  getRouterLink(path: string[]): string[] {
    const country = this.localizationService.country;
    const locale = this.localizationService.locale;
    
    return ['/', country, locale, ...path];
  }

  /**
   * Getter para usar en templates más fácilmente
   */
  get routerLinks() {
    return {
      home: this.getRouterLink(['home']),
      login: this.getRouterLink(['auth', 'login']),
      register: this.getRouterLink(['auth', 'register']),
      myAccount: this.getRouterLink(['account', 'my-account']),
      myAddresses: this.getRouterLink(['account', 'myaddresses']),
      addAddress: this.getRouterLink(['account', 'myaddresses', 'add']),
      checkout: this.getRouterLink(['account', 'checkout']),
      shop: this.getRouterLink(['shop', 'home'])
    };
  }
}