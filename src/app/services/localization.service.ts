import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private countrySubject = new BehaviorSubject<string>('es');
  private localeSubject = new BehaviorSubject<string>('es');
  
  country$ = this.countrySubject.asObservable();
  locale$ = this.localeSubject.asObservable();
  
  // constructor(private activatedRoute: ActivatedRoute, private router: Router) {
  //   this.activatedRoute.paramMap.subscribe(params => {
  //     const locale = params.get('locale') || 'es';
  //     const country = params.get('country') || 'es';
      
      
  //     // Actualizar los valores cuando cambian en la ruta
  //     this.countrySubject.next(country);
  //     this.localeSubject.next(locale);
      
  //   });
  // }

  setLocaleAndCountry(country: string, locale: string) {
    this.countrySubject.next(country);
    this.localeSubject.next(locale);
  }

  get country(): string {
    return this.countrySubject.value;
  }

  get locale(): string {
    return this.localeSubject.value;
  }
  
}
