import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {

  private readonly COOKIE_KEY = 'cookie_consent';

  constructor() { }

  hasUserConsented(): boolean {
    return sessionStorage.getItem(this.COOKIE_KEY) !== null;
  }

  setConsent(consent: 'accepted' | 'rejected') {
    sessionStorage.setItem(this.COOKIE_KEY, consent);
  }

  getConsent(): 'accepted' | 'rejected' | null {
    return sessionStorage.getItem(this.COOKIE_KEY) as any;
  }
}
