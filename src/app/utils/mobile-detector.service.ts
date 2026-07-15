import { Injectable } from '@angular/core';

/**
 * 📱 MobileDetectorService
 * 
 * Servicio para detectar si el usuario está en un dispositivo móvil.
 * Usado para evitar comportamientos que causen zoom o reflow en móvil (autofocus, focus programático, etc.)
 * 
 * Basado en: User Agent + Visual Viewport API
 */
@Injectable({
  providedIn: 'root'
})
export class MobileDetectorService {
  private isMobileDevice: boolean = false;
  private isTabletDevice: boolean = false;

  constructor() {
    this.detectDevice();
  }

  /**
   * Detecta el tipo de dispositivo basado en User Agent y viewport
   */
  private detectDevice(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isWindowsPhone = /windows phone/.test(ua);
    const isBlackBerry = /blackberry/.test(ua);

    // Detección de tablet
    const isIPad = /ipad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidTablet = isAndroid && !/mobile/.test(ua);

    this.isTabletDevice = isIPad || isAndroidTablet;
    this.isMobileDevice = (isAndroid || isIOS || isWindowsPhone || isBlackBerry) && !this.isTabletDevice;
  }

  /**
   * Retorna true si es un dispositivo móvil (teléfono)
   */
  isMobile(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Retorna true si es una tablet
   */
  isTablet(): boolean {
    return this.isTabletDevice;
  }

  /**
   * Retorna true si es móvil o tablet (cualquier touch device)
   */
  isTouchDevice(): boolean {
    return this.isMobileDevice || this.isTabletDevice;
  }

  /**
   * Retorna el ancho del viewport
   */
  getViewportWidth(): number {
    if (typeof window === 'undefined') return 0;
    return window.visualViewport?.width || window.innerWidth;
  }

  /**
   * Retorna el alto del viewport
   */
  getViewportHeight(): number {
    if (typeof window === 'undefined') return 0;
    return window.visualViewport?.height || window.innerHeight;
  }

  /**
   * Detecta si el teclado virtual está visible (aproximación)
   * Útil para ajustar UI cuando el teclado aparece
   */
  isVirtualKeyboardVisible(): boolean {
    if (typeof window === 'undefined' || !window.visualViewport) return false;
    
    const visualViewportHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    
    // Si el viewport visual es significativamente menor que window.innerHeight,
    // probablemente el teclado está visible
    return visualViewportHeight < windowHeight * 0.75;
  }

  /**
   * Obtiene información completa del dispositivo
   */
  getDeviceInfo(): {
    isMobile: boolean;
    isTablet: boolean;
    isTouchDevice: boolean;
    viewportWidth: number;
    viewportHeight: number;
    userAgent: string;
  } {
    return {
      isMobile: this.isMobileDevice,
      isTablet: this.isTabletDevice,
      isTouchDevice: this.isMobileDevice || this.isTabletDevice,
      viewportWidth: this.getViewportWidth(),
      viewportHeight: this.getViewportHeight(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };
  }
}
