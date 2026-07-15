import { Injectable } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
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

  readonly languageOptions: { [key: string]: { code: string, name: string }[] } = {
    'es': [{ code: 'es', name: 'Castellano' }],
    'fr': [{ code: 'fr', name: 'Français' }],
    'it': [{ code: 'it', name: 'Italiano' }],
    'de': [{ code: 'de', name: 'Deutsch' }]
  };
  
  constructor(private router: Router) {
    // Escuchar cambios de ruta para actualizar país/idioma automáticamente
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateFromUrl(event.url);
    });

    // Inicializar desde la URL actual
    this.updateFromUrl(this.router.url);
  }

  /**
   * Actualiza país e idioma desde la URL actual
   */
  private updateFromUrl(url: string) {
    const segments = url.split('/').filter(s => s);
    
    if (segments.length >= 2) {
      const country = segments[0];
      const locale = segments[1];
      
      // Solo actualizar si son válidos (2 caracteres)
      if (country.length === 2 && locale.length === 2) {
        this.countrySubject.next(country);
        this.localeSubject.next(locale);
      }
    }
  }

  /**
   * Establece país e idioma manualmente (para pre-home)
   */
  setLocaleAndCountry(country: string, locale: string) {
    this.countrySubject.next(country);
    this.localeSubject.next(locale);
  }

  /**
   * Obtiene país actual (desde URL o estado)
   */
  get country(): string {
    return this.countrySubject.value;
  }

  /**
   * Obtiene idioma actual (desde URL o estado)
   */
  get locale(): string {
    return this.localeSubject.value;
  }

  /**
   * Obtiene el prefijo completo para rutas
   */
  get routePrefix(): string {
    return `/${this.country}/${this.locale}`;
  }
}
