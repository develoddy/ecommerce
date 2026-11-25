import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private countrySubject = new BehaviorSubject<string>('es');
  private localeSubject = new BehaviorSubject<string>('es');

  country$ = this.countrySubject.asObservable();
  locale$ = this.localeSubject.asObservable();

  // Configuración centralizada de países e idiomas
  readonly countries = [
    { code: 'es', name: 'España' },
    { code: 'fr', name: 'France' },
    { code: 'it', name: 'Italia' },
    { code: 'de', name: 'Deutschland' }
  ];

  readonly languageOptions: {
    [key: string]: { code: string, name: string }[]
  } = {
    'es': [
      { code: 'es', name: 'Castellano' },
      { code: 'en', name: 'English' }
    ],
    'fr': [{ code: 'fr', name: 'Français' }],
    'it': [{ code: 'it', name: 'Italiano' }],
    'de': [{ code: 'de', name: 'Deutsch' }]
  };

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(
        (event): event is NavigationEnd =>
          event instanceof NavigationEnd
      )
    ).subscribe((event: NavigationEnd) => {
      this.updateFromUrl(event.urlAfterRedirects);
    });

    this.updateFromUrl(this.router.url);
  }

  /**
   * Valida una combinación de país e idioma.
   */
  isValidLocale(country: string, locale: string): boolean {
    const validCountry = this.countries.some(
      item => item.code === country
    );

    if (!validCountry) {
      return false;
    }

    return (this.languageOptions[country] || [])
      .some(item => item.code === locale);
  }

  /**
   * Actualiza país e idioma desde la URL.
   */
  private updateFromUrl(url: string): void {
    const urlTree = this.router.parseUrl(url);
    const primary = urlTree.root.children['primary'];

    if (!primary || primary.segments.length < 2) {
      return;
    }

    const country = primary.segments[0].path;
    const locale = primary.segments[1].path;

    this.setLocaleAndCountry(country, locale);
  }

  /**
   * Establece una combinación regional válida.
   */
  setLocaleAndCountry(country: string, locale: string): void {
    if (!this.isValidLocale(country, locale)) {
      return;
    }

    if (this.countrySubject.value !== country) {
      this.countrySubject.next(country);
    }

    if (this.localeSubject.value !== locale) {
      this.localeSubject.next(locale);
    }
  }

  /**
   * Obtiene el idioma disponible para las traducciones de la interfaz.
   * No modifica el contexto regional del ecommerce.
   */
  getTranslationLocale(locale: string = this.locale): string {
    const supportedLocales = ['es', 'en'];

    return supportedLocales.includes(locale) ? locale : 'en';
  }

  get country(): string {
    return this.countrySubject.value;
  }

  get locale(): string {
    return this.localeSubject.value;
  }

  get routePrefix(): string {
    return `/${this.country}/${this.locale}`;
  }
}
