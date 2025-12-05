import { Injectable } from '@angular/core';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {

  private readonly COOKIE_KEY = 'cookie_consent';
  private readonly PREFERENCES_KEY = 'cookie_preferences';

  constructor() { }

  hasUserConsented(): boolean {
    return localStorage.getItem(this.COOKIE_KEY) !== null;
  }

  setConsent(consent: 'accepted' | 'rejected' | 'custom') {
    localStorage.setItem(this.COOKIE_KEY, consent);
  }

  getConsent(): 'accepted' | 'rejected' | 'custom' | null {
    return localStorage.getItem(this.COOKIE_KEY) as any;
  }

  setPreferences(preferences: CookiePreferences) {
    localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
  }

  getPreferences(): CookiePreferences {
    const stored = localStorage.getItem(this.PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Default: solo cookies necesarias
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
  }

  // Métodos específicos para cada tipo de cookie
  canUseAnalytics(): boolean {
    const consent = this.getConsent();
    if (consent === 'accepted') return true;
    if (consent === 'rejected') return false;
    return this.getPreferences().analytics;
  }

  canUseMarketing(): boolean {
    const consent = this.getConsent();
    if (consent === 'accepted') return true;
    if (consent === 'rejected') return false;
    return this.getPreferences().marketing;
  }

  canUseFunctional(): boolean {
    const consent = this.getConsent();
    if (consent === 'accepted') return true;
    if (consent === 'rejected') return false;
    return this.getPreferences().functional;
  }

  clearConsent() {
    localStorage.removeItem(this.COOKIE_KEY);
    localStorage.removeItem(this.PREFERENCES_KEY);
  }
}
