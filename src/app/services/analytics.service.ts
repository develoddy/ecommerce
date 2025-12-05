import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CookieConsentService } from './cookie-consent.service';

declare var gtag: Function;
declare var fbq: Function;

interface GAEvent {
  event_category?: string;
  event_label?: string;
  value?: number;
  custom_parameters?: any;
}

interface GAEcommerceItem {
  item_id: string;
  item_name: string;
  category?: string;
  quantity?: number;
  price?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private ga4Initialized = false;
  private metaPixelInitialized = false;
  private isBrowser: boolean;
  
  // 🔧 IDs de configuración - CAMBIAR POR LOS REALES
  private readonly GA4_MEASUREMENT_ID = 'G-VKXW9PHC3B'; 
  private readonly META_PIXEL_ID = '000000000000000';

  constructor(
    private cookieConsentService: CookieConsentService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async initializeAnalytics(): Promise<void> {
    // Solo ejecutar en el navegador (SSR-safe)
    if (!this.isBrowser) {
      console.log('🔄 Analytics initialization skipped (SSR mode)');
      return;
    }

    console.log('🎯 Iniciando carga de analytics con consentimiento del usuario...');

    const promises: Promise<void>[] = [];

    // Solo inicializar si el usuario ha dado consentimiento
    if (this.cookieConsentService.canUseAnalytics()) {
      console.log('📊 Iniciando carga de Google Analytics 4...');
      promises.push(this.initGA4());
    }
    
    if (this.cookieConsentService.canUseMarketing()) {
      console.log('📱 Iniciando carga de Meta Pixel...');
      promises.push(this.initMetaPixel());
    }

    // Esperar a que todas las inicializaciones terminen (compatible con ES2019)
    if (promises.length > 0) {
      try {
        await Promise.all(promises.map(p => p.catch(err => console.error('Analytics init error:', err))));
        console.log('🎯 Analytics initialization completed with user consent');
      } catch (error) {
        console.error('❌ Error durante la inicialización de analytics:', error);
      }
    } else {
      console.log('🔒 Analytics no inicializado - sin consentimiento del usuario');
    }
  }

  private async initGA4(): Promise<void> {
    if (this.ga4Initialized || !this.isBrowser) return;

    try {
      // 🔄 Cargar script de GA4 de forma asíncrona y esperar a que esté listo
      await this.loadGA4Script();
      
      // 🔧 Configurar GA4 solo después de que el script esté cargado
      this.configureGA4();
      
    } catch (error) {
      console.error('❌ Error inicializando GA4:', error);
    }
  }

  /**
   * Cargar script de GA4 y esperar a que esté completamente disponible
   */
  private loadGA4Script(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya existe el script
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${this.GA4_MEASUREMENT_ID}"]`);
      if (existingScript) {
        // Si ya existe, verificar si gtag está disponible
        if (typeof (window as any).gtag === 'function') {
          resolve();
          return;
        }
      }

      // Inicializar dataLayer inmediatamente
      (window as any).dataLayer = (window as any).dataLayer || [];
      
      // Definir función gtag antes de cargar el script
      (window as any).gtag = function() {
        (window as any).dataLayer.push(arguments);
      };

      // Crear y configurar script
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA4_MEASUREMENT_ID}`;
      
      // Manejar carga exitosa
      script.onload = () => {
        // Esperar un momento adicional para asegurar que gtag esté completamente disponible
        setTimeout(() => {
          if (typeof (window as any).gtag === 'function') {
            console.log('📦 Script GA4 cargado correctamente');
            resolve();
          } else {
            reject(new Error('gtag function no disponible después de cargar script'));
          }
        }, 100);
      };

      // Manejar errores de carga
      script.onerror = () => {
        reject(new Error('Error cargando script de GA4'));
      };

      // Timeout de seguridad (10 segundos)
      setTimeout(() => {
        reject(new Error('Timeout cargando script de GA4'));
      }, 10000);

      // Añadir script al DOM
      const targetElement = document.body || document.head;
      targetElement.appendChild(script);
    });
  }

  /**
   * Configurar GA4 después de que el script esté cargado
   */
  private configureGA4(): void {
    try {
      const gtag = (window as any).gtag;
      
      if (typeof gtag !== 'function') {
        throw new Error('gtag function no está disponible');
      }

      // Configuración inicial con timestamp
      gtag('js', new Date());

      // Configurar GA4 con settings RGPD-compliant
      gtag('config', this.GA4_MEASUREMENT_ID, {
        // 🔒 RGPD Compliance Settings
        anonymize_ip: true,
        cookie_flags: 'SameSite=Lax;Secure',
        cookie_expires: 63072000, // 2 años máximo RGPD
        allow_google_signals: false, // No compartir datos con Google
        allow_ad_personalization_signals: false, // No personalización ads
        
        // 🚀 Performance Settings
        send_page_view: true,
        page_title: document.title,
        page_location: window.location.href,
        
        // 🎯 Custom Settings
        custom_map: {
          'custom_parameter_1': 'ecommerce_type'
        }
      });

      // Evento inicial de configuración
      gtag('event', 'analytics_initialized', {
        event_category: 'system',
        event_label: 'GA4_ready',
        custom_parameters: {
          consent_method: this.cookieConsentService.getConsent(),
          initialization_timestamp: new Date().toISOString()
        }
      });
      
      this.ga4Initialized = true;
      console.log('✅ Google Analytics 4 inicializado correctamente con RGPD compliance');
      
    } catch (error) {
      console.error('❌ Error configurando GA4:', error);
      throw error;
    }
  }

  private async initMetaPixel(): Promise<void> {
    if (this.metaPixelInitialized || !this.isBrowser) return;

    try {
      // 🔄 Cargar script de Meta Pixel de forma asíncrona
      await this.loadMetaPixelScript();
      
      // 🔧 Configurar Meta Pixel después de que esté cargado
      this.configureMetaPixel();
      
    } catch (error) {
      console.error('❌ Error inicializando Meta Pixel:', error);
    }
  }

  /**
   * Cargar script de Meta Pixel y esperar a que esté disponible
   */
  private loadMetaPixelScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya existe
      if ((window as any).fbq && typeof (window as any).fbq === 'function') {
        resolve();
        return;
      }

      // Meta Pixel Code optimizado con Promise
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        // Verificar si ya existe para evitar doble inicialización
        if (f.fbq) {
          resolve();
          return;
        }
        
        // Inicializar función fbq
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        
        // Crear script de forma optimizada
        t = b.createElement(e);
        t.async = !0;
        t.defer = !0;
        t.src = v;
        
        // Manejar carga exitosa
        t.onload = () => {
          setTimeout(() => {
            if (typeof f.fbq === 'function') {
              console.log('📦 Script Meta Pixel cargado correctamente');
              resolve();
            } else {
              reject(new Error('fbq function no disponible después de cargar script'));
            }
          }, 100);
        };

        // Manejar errores
        t.onerror = () => {
          reject(new Error('Error cargando script de Meta Pixel'));
        };

        // Timeout de seguridad
        setTimeout(() => {
          if (typeof f.fbq !== 'function') {
            reject(new Error('Timeout cargando script de Meta Pixel'));
          }
        }, 10000);
        
        // Insertar script
        s = b.getElementsByTagName('body')[0] || b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
        
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    });
  }

  /**
   * Configurar Meta Pixel después de que el script esté cargado
   */
  private configureMetaPixel(): void {
    try {
      const fbq = (window as any).fbq;
      
      if (typeof fbq !== 'function') {
        throw new Error('fbq function no está disponible');
      }

      // Configurar Meta Pixel con RGPD compliance
      fbq('init', this.META_PIXEL_ID, {
        // 🔒 RGPD Settings para Meta Pixel
        external_id: undefined, // No usar ID externos por defecto
        em: undefined, // No email tracking por defecto
        ph: undefined, // No phone tracking por defecto
        
        // 🚀 Performance y Privacy Settings
        autoConfig: false, // Control manual de configuración
        debug: false // Desactivar debug en producción
      });

      // PageView inicial solo si hay consentimiento
      fbq('track', 'PageView', {
        content_category: 'ecommerce',
        source: 'organic',
        consent_method: this.cookieConsentService.getConsent()
      });

      // Evento de inicialización para tracking interno
      fbq('trackCustom', 'PixelInitialized', {
        initialization_timestamp: new Date().toISOString(),
        consent_granted: true
      });

      this.metaPixelInitialized = true;
      console.log('✅ Meta Pixel inicializado correctamente con RGPD compliance');
      
    } catch (error) {
      console.error('❌ Error configurando Meta Pixel:', error);
      throw error;
    }
  }

  // 🎯 EVENTOS GENERALES DE TRACKING

  /**
   * Evento genérico para GA4
   * @param eventName Nombre del evento
   * @param parameters Parámetros del evento
   */
  trackEvent(eventName: string, parameters: GAEvent = {}) {
    if (!this.isBrowser || !this.ga4Initialized || !this.cookieConsentService.canUseAnalytics()) {
      return;
    }

    try {
      gtag('event', eventName, {
        event_category: parameters.event_category || 'engagement',
        event_label: parameters.event_label,
        value: parameters.value,
        ...parameters.custom_parameters
      });
      console.log(`📊 GA4 Event tracked: ${eventName}`, parameters);
    } catch (error) {
      console.error('❌ Error tracking GA4 event:', error);
    }
  }

  /**
   * Evento personalizado para Meta Pixel
   * @param eventName Nombre del evento
   * @param parameters Parámetros del evento
   */
  trackCustomEvent(eventName: string, parameters: any = {}) {
    if (!this.isBrowser || !this.metaPixelInitialized || !this.cookieConsentService.canUseMarketing()) {
      return;
    }

    try {
      fbq('trackCustom', eventName, {
        timestamp: new Date().toISOString(),
        ...parameters
      });
      console.log(`📱 Meta Pixel Event tracked: ${eventName}`, parameters);
    } catch (error) {
      console.error('❌ Error tracking Meta Pixel event:', error);
    }
  }

  // 🛍️ EVENTOS DE E-COMMERCE

  /**
   * Tracking de vista de producto
   * @param productId ID del producto
   * @param productName Nombre del producto
   * @param category Categoría del producto
   * @param value Precio del producto
   */
  trackProductView(productId: string, productName: string, category?: string, value?: number) {
    // GA4 - View Item Event
    this.trackEvent('view_item', {
      event_category: 'ecommerce',
      event_label: productName,
      custom_parameters: {
        item_id: productId,
        item_name: productName,
        item_category: category,
        currency: 'EUR',
        value: value
      }
    });

    // Meta Pixel - ViewContent Event
    this.trackStandardMetaEvent('ViewContent', {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      content_type: 'product',
      value: value,
      currency: 'EUR'
    });
  }

  /**
   * Tracking de añadir al carrito
   * @param productId ID del producto
   * @param productName Nombre del producto
   * @param category Categoría
   * @param value Precio
   * @param quantity Cantidad
   */
  trackAddToCart(productId: string, productName: string, category?: string, value?: number, quantity: number = 1) {
    // GA4 - Add to Cart Event
    this.trackEvent('add_to_cart', {
      event_category: 'ecommerce',
      event_label: productName,
      value: value,
      custom_parameters: {
        currency: 'EUR',
        value: value,
        items: [{
          item_id: productId,
          item_name: productName,
          item_category: category,
          quantity: quantity,
          price: value
        }]
      }
    });

    // Meta Pixel - AddToCart Event
    this.trackStandardMetaEvent('AddToCart', {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      content_type: 'product',
      value: value,
      currency: 'EUR',
      num_items: quantity
    });
  }

  /**
   * Tracking de inicio de checkout
   * @param value Valor total del carrito
   * @param items Items del carrito
   */
  trackBeginCheckout(value: number, items: GAEcommerceItem[] = []) {
    // GA4 - Begin Checkout Event
    this.trackEvent('begin_checkout', {
      event_category: 'ecommerce',
      value: value,
      custom_parameters: {
        currency: 'EUR',
        value: value,
        items: items
      }
    });

    // Meta Pixel - InitiateCheckout Event
    this.trackStandardMetaEvent('InitiateCheckout', {
      content_ids: items.map(item => item.item_id),
      content_category: 'checkout',
      content_type: 'product',
      value: value,
      currency: 'EUR',
      num_items: items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    });
  }

  /**
   * Tracking de compra completada
   * @param transactionId ID de la transacción
   * @param value Valor total
   * @param currency Moneda
   * @param items Items comprados
   */
  trackPurchase(transactionId: string, value: number, currency: string = 'EUR', items: GAEcommerceItem[] = []) {
    // GA4 - Purchase Event
    this.trackEvent('purchase', {
      event_category: 'ecommerce',
      value: value,
      custom_parameters: {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        items: items,
        shipping: 0, // Actualizar con costo real de envío
        tax: value * 0.21 // IVA español 21%
      }
    });

    // Meta Pixel - Purchase Event
    this.trackPurchaseMeta(value, currency, {
      content_ids: items.map(item => item.item_id),
      content_name: items.map(item => item.item_name).join(', '),
      content_type: 'product',
      num_items: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      order_id: transactionId
    });

    console.log('🎉 Purchase tracked successfully:', { transactionId, value, currency });
  }

  /**
   * Evento de compra para Meta Pixel (método mejorado)
   * @param value Valor de la compra
   * @param currency Moneda
   * @param additionalParams Parámetros adicionales
   */
  trackPurchaseMeta(value: number, currency: string = 'EUR', additionalParams: any = {}) {
    this.trackStandardMetaEvent('Purchase', {
      value: value,
      currency: currency,
      ...additionalParams
    });
  }

  /**
   * Tracking de búsqueda en el sitio
   * @param searchTerm Término de búsqueda
   * @param resultsCount Número de resultados
   */
  trackSearch(searchTerm: string, resultsCount?: number) {
    // GA4 - Search Event
    this.trackEvent('search', {
      event_category: 'engagement',
      event_label: searchTerm,
      custom_parameters: {
        search_term: searchTerm,
        results_count: resultsCount
      }
    });

    // Meta Pixel - Search Event
    this.trackStandardMetaEvent('Search', {
      search_string: searchTerm,
      content_category: 'search_results',
      num_results: resultsCount
    });
  }

  // 📱 EVENTOS ESPECÍFICOS PARA E-COMMERCE

  /**
   * Tracking de suscripción a newsletter
   * @param email Email del suscriptor (hasheado para RGPD)
   */
  trackNewsletterSignup(email?: string) {
    this.trackEvent('newsletter_signup', {
      event_category: 'engagement',
      event_label: 'newsletter_subscription'
    });

    this.trackCustomEvent('NewsletterSignup', {
      subscription_method: 'website_footer'
    });
  }

  /**
   * Tracking de contacto/chat iniciado
   */
  trackContactInitiated() {
    this.trackEvent('contact_initiated', {
      event_category: 'engagement',
      event_label: 'chat_widget'
    });

    this.trackStandardMetaEvent('Contact', {
      content_category: 'customer_service'
    });
  }

  // 🔧 MÉTODOS AUXILIARES

  /**
   * Evento estándar de Meta Pixel
   * @param eventName Nombre del evento estándar
   * @param parameters Parámetros del evento
   */
  private trackStandardMetaEvent(eventName: string, parameters: any = {}) {
    if (!this.isBrowser || !this.metaPixelInitialized || !this.cookieConsentService.canUseMarketing()) {
      return;
    }

    try {
      fbq('track', eventName, parameters);
    } catch (error) {
      console.error(`❌ Error tracking Meta Pixel standard event ${eventName}:`, error);
    }
  }

  // 🔧 GESTIÓN Y CONTROL DE ANALYTICS

  /**
   * Desactivar analytics cuando el usuario rechaza cookies
   */
  disableAnalytics() {
    if (!this.isBrowser) return;

    try {
      // Desactivar GA4
      if (this.ga4Initialized) {
        gtag('config', this.GA4_MEASUREMENT_ID, {
          send_page_view: false,
          anonymize_ip: true
        });
        
        // Enviar evento de desactivación antes de desactivar
        gtag('event', 'analytics_disabled', {
          event_category: 'privacy',
          event_label: 'user_opt_out'
        });
        
        console.log('🔒 Google Analytics desactivado por preferencias del usuario');
      }
      
      // Meta Pixel es más difícil de desactivar una vez cargado
      if (this.metaPixelInitialized) {
        console.log('🔒 Meta Pixel desactivado (requiere recarga de página para efecto completo)');
        
        // Marcar como desactivado para evitar futuros eventos
        this.metaPixelInitialized = false;
      }
      
    } catch (error) {
      console.error('❌ Error desactivando analytics:', error);
    }
  }

  /**
   * Reactivar analytics cuando el usuario acepta cookies
   */
  async reactivateAnalytics(): Promise<void> {
    if (!this.isBrowser) return;

    const canUseAnalytics = this.cookieConsentService.canUseAnalytics();
    const canUseMarketing = this.cookieConsentService.canUseMarketing();

    const promises: Promise<void>[] = [];

    if (canUseAnalytics && !this.ga4Initialized) {
      promises.push(this.initGA4());
    }

    if (canUseMarketing && !this.metaPixelInitialized) {
      promises.push(this.initMetaPixel());
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises.map(p => p.catch(err => console.error('Analytics reactivation error:', err))));
        console.log('🔄 Analytics reactivados según preferencias del usuario');
      } catch (error) {
        console.error('❌ Error reactivando analytics:', error);
      }
    }
  }

  /**
   * Verificar estado actual de inicialización
   */
  getAnalyticsStatus() {
    return {
      ga4Initialized: this.ga4Initialized,
      metaPixelInitialized: this.metaPixelInitialized,
      canUseAnalytics: this.cookieConsentService.canUseAnalytics(),
      canUseMarketing: this.cookieConsentService.canUseMarketing(),
      isBrowser: this.isBrowser,
      consentStatus: this.cookieConsentService.getConsent()
    };
  }

  /**
   * Limpiar completamente analytics (para testing o reset)
   */
  clearAnalytics() {
    if (!this.isBrowser) return;

    try {
      // Limpiar GA4
      if (this.ga4Initialized) {
        delete (window as any).gtag;
        delete (window as any).dataLayer;
      }

      // Limpiar Meta Pixel
      if (this.metaPixelInitialized) {
        delete (window as any).fbq;
        delete (window as any)._fbq;
      }

      // Reset estados
      this.ga4Initialized = false;
      this.metaPixelInitialized = false;

      // Remover scripts si existen
      const ga4Scripts = document.querySelectorAll(`script[src*="googletagmanager.com/gtag/js"]`);
      const metaScripts = document.querySelectorAll(`script[src*="connect.facebook.net"]`);
      
      ga4Scripts.forEach(script => script.remove());
      metaScripts.forEach(script => script.remove());

      console.log('🧹 Analytics completamente limpiados');
    } catch (error) {
      console.error('❌ Error limpiando analytics:', error);
    }
  }

  // 📊 MÉTODOS DE UTILIDAD

  /**
   * Verificar si las herramientas están disponibles y funcionando
   */
  healthCheck(): Promise<{ ga4: boolean; metaPixel: boolean }> {
    return new Promise((resolve) => {
      if (!this.isBrowser) {
        resolve({ ga4: false, metaPixel: false });
        return;
      }

      setTimeout(() => {
        const ga4Available = typeof (window as any).gtag === 'function' && this.ga4Initialized;
        const metaPixelAvailable = typeof (window as any).fbq === 'function' && this.metaPixelInitialized;

        resolve({
          ga4: ga4Available,
          metaPixel: metaPixelAvailable
        });
      }, 1000); // Esperar 1 segundo para que se carguen los scripts
    });
  }

  /**
   * Debug: Mostrar información completa del estado de analytics
   */
  debugInfo() {
    if (!this.isBrowser) {
      console.log('🔍 Analytics Debug: Ejecutándose en modo SSR');
      return;
    }

    const status = this.getAnalyticsStatus();
    console.group('🔍 Analytics Debug Information');
    console.log('📊 Status:', status);
    console.log('🍪 Cookie Preferences:', this.cookieConsentService.getPreferences());
    console.log('🌐 Window Objects:', {
      gtag: typeof (window as any).gtag,
      fbq: typeof (window as any).fbq,
      dataLayer: Array.isArray((window as any).dataLayer)
    });
    console.groupEnd();
  }
}