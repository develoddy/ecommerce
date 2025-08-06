import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {

  private readonly COOKIE_KEY = 'cookie_consent';

  constructor() { }

  hasUserConsented(): boolean {
    return localStorage.getItem(this.COOKIE_KEY) !== null;
  }

  setConsent(consent: 'accepted' | 'rejected') {
    localStorage.setItem(this.COOKIE_KEY, consent);
  }

  getConsent(): 'accepted' | 'rejected' | null {
    return localStorage.getItem(this.COOKIE_KEY) as any;
  }

  clearConsent() {
    localStorage.removeItem(this.COOKIE_KEY);
  }
}
