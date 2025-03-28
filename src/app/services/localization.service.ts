import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private localeSubject = new BehaviorSubject<string>('es');
  private countrySubject = new BehaviorSubject<string>('es');

  locale$ = this.localeSubject.asObservable();
  country$ = this.countrySubject.asObservable();

  constructor(private activatedRoute: ActivatedRoute, private router: Router) {
    this.activatedRoute.paramMap.subscribe(params => {
      const locale = params.get('locale') || 'es';
      const country = params.get('country') || 'es';
      
      // Actualizar los valores cuando cambian en la ruta
      this.localeSubject.next(locale);
      this.countrySubject.next(country);
    });
  }

  get locale(): string {
    return this.localeSubject.value;
  }

  get country(): string {
    return this.countrySubject.value;
  }
}
