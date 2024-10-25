import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private selectedLanguageSubject = new BehaviorSubject<string>('es');
  selectedLanguage$ = this.selectedLanguageSubject.asObservable();

  constructor() { }

  setLanguage(language: string) {
    this.selectedLanguageSubject.next(language);
  }
}
