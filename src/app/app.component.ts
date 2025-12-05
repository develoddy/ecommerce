import { AfterViewInit, Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from './modules/auth-profile/_services/auth.service';
import { TokenService } from './modules/auth-profile/_services/token.service';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizationService } from './services/localization.service';
import { GuestCleanupService } from './modules/ecommerce-guest/_service/guestCleanup.service';
import { HeaderEventsService } from './services/headerEvents.service';
import { CookieConsentService, CookiePreferences } from './services/cookie-consent.service';
import { SeoService } from './services/seo.service';
import { HomeService } from './modules/home/_services/home.service';
import { AnalyticsService } from './services/analytics.service';
import { environment } from 'src/environments/environment';
// import { LoaderService } from './modules/home/_services/product/loader.service';
declare var bootstrap: any;

declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;
declare function productSlider5items($: any): any;
declare function sliderRefresh(): any;
declare function pswp([]):any;
declare function productZoom([]):any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  
  title = 'ecommerce';
  locale: string = "";
  country: string = "";  
  private modalInstance: any;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = true;
  hasProducts: boolean = false;
  width: number = 100; 
  height: number = 100;
  showPreferences: boolean = false;
  loadingAnalytics: boolean = false;
  isProduction: boolean = environment.production;
  cookiePreferences: CookiePreferences = {
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false
  }; 

  constructor(
    // public loader: LoaderService,
    private translate: TranslateService, 
    private router: Router,
    private titleService: Title, 
    private bodyClassService: BodyClassService,
    private localizationService: LocalizationService,
    private headerEventsService: HeaderEventsService,
    private cookieConsentService: CookieConsentService,
    private authService: AuthService,
    private tokenService: TokenService,
    private homeService: HomeService,
    private analyticsService: AnalyticsService
  ) {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translate.get('app.title').subscribe((res: string) => {
        this.titleService.setTitle(res);
      });
    });

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  async ngAfterViewInit(): Promise<void> {
    const consentGiven = this.cookieConsentService.hasUserConsented();
    
    if (!consentGiven) {
      // Mostrar modal de consentimiento
      const modalElement = document.getElementById('cookie_modal');
      if (modalElement) {
        this.modalInstance = new bootstrap.Modal(modalElement, {
          backdrop: 'static', // Evitar cerrar haciendo click fuera
          keyboard: false     // Evitar cerrar con ESC
        });
        this.modalInstance.show();
      }
    } else {
      // Si ya hay consentimiento, inicializar analytics
      try {
        await this.initializeAnalytics();
        
        // Debug info en desarrollo
        setTimeout(() => {
          this.analyticsService.debugInfo();
        }, 3000); // Más tiempo para que se carguen los scripts
      } catch (error) {
        console.error('❌ Error inicializando analytics en ngAfterViewInit:', error);
      }
    }
  }

  ngOnInit(): void {
    this.bodyClassService.updateBodyClass("index-demo1");
    this.headerEventsService.forceLogin$.subscribe(() => {
      this.handleForceLogin();
    });
    this.checkDeviceType();

    // 🔄 Refresh proactivo de tokens cada 2 minutos
    this.initTokenRefreshTimer();

    // Check if products exist for chat widget visibility
    this.homeService.listHome().subscribe({
      next: (resp: any) => {
        this.hasProducts = resp && resp.our_products && resp.our_products.length > 0;
      },
      error: () => {
        this.hasProducts = false;
      }
    });

    setTimeout(() => {
      HOMEINITTEMPLATE($);
      productSlider5items($);
      (window as any).sliderRefresh($);
    }, 150);
  }

  /**
   * Inicializa timer para refrescar token automáticamente antes de que expire
   */
  private initTokenRefreshTimer(): void {
    // Verificar cada 2 minutos si el token está cerca de expirar
    setInterval(() => {
      const isAuthenticated = this.authService.isAuthenticatedUser();
      if (!isAuthenticated) return;

      if (this.tokenService.isTokenNearExpiration()) {
        console.log('🔄 Token cerca de expirar, refrescando automáticamente...');
        this.tokenService.refreshingToken().subscribe({
          next: () => console.log('✅ Token refrescado exitosamente'),
          error: (err: any) => {
            console.error('❌ Error refrescando token:', err);
            // El interceptor manejará el logout si es necesario
          }
        });
      }
    }, 120000); // 2 minutos
  }

  handleForceLogin() {
    // Navegación SPA sin recarga completa
    this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
  }

  async acceptCookies() {
    // Aceptar todas las cookies
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    
    this.cookieConsentService.setPreferences(allAccepted);
    this.cookieConsentService.setConsent('accepted');
    
    // Cerrar modal primero para mejor UX
    this.modalInstance?.hide();
    
    // Mostrar indicador de carga
    this.loadingAnalytics = true;
    
    // Inicializar analytics de forma asíncrona
    try {
      console.log('🔄 Inicializando analytics tras aceptar cookies...');
      await this.initializeAnalytics();
      console.log('✅ Usuario aceptó todas las cookies - Analytics inicializados correctamente');
    } catch (error) {
      console.error('❌ Error inicializando analytics tras aceptar cookies:', error);
    } finally {
      this.loadingAnalytics = false;
    }
  }

  rejectCookies() {
    // Solo cookies necesarias
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    
    this.cookieConsentService.setPreferences(onlyNecessary);
    this.cookieConsentService.setConsent('rejected');
    
    // Desactivar analytics si estaban activos
    this.analyticsService.disableAnalytics();
    
    // Cerrar modal
    this.modalInstance?.hide();
    
    console.log('🔒 Usuario rechazó cookies opcionales - Solo cookies necesarias activas');
  }

  async saveCustomPreferences() {
    this.cookieConsentService.setPreferences(this.cookiePreferences);
    this.cookieConsentService.setConsent('custom');
    
    // Reset vista y cerrar modal primero
    this.showPreferences = false;
    this.modalInstance?.hide();
    
    // Mostrar indicador de carga si es necesario
    if (this.cookiePreferences.analytics || this.cookiePreferences.marketing) {
      this.loadingAnalytics = true;
    }
    
    // Gestionar analytics según preferencias personalizadas
    try {
      if (this.cookiePreferences.analytics || this.cookiePreferences.marketing) {
        console.log('🔄 Inicializando analytics con preferencias personalizadas...');
        await this.initializeAnalytics();
        console.log('✅ Analytics inicializados con preferencias personalizadas');
      } else {
        this.analyticsService.disableAnalytics();
        console.log('🔒 Analytics desactivados según preferencias personalizadas');
      }
    } catch (error) {
      console.error('❌ Error aplicando preferencias personalizadas:', error);
    } finally {
      this.loadingAnalytics = false;
    }
    
    console.log('⚙️ Usuario configuró preferencias personalizadas:', this.cookiePreferences);
  }

  togglePreferences() {
    this.showPreferences = !this.showPreferences;
    if (this.showPreferences) {
      // Cargar preferencias actuales si existen
      this.cookiePreferences = this.cookieConsentService.getPreferences();
    }
  }

  gotoPoliticaCookie() {
    this.router.navigate(['/', this.locale, this.country, 'shop', 'privacy-policy']);
    this.modalInstance?.hide();
  }

  private async initializeAnalytics(): Promise<void> {
    // Inicializar analytics basado en consentimiento del usuario
    return await this.analyticsService.initializeAnalytics();
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    if (this.isMobile) {
        this.width = 80;  
        this.height = 80; 
    } else {
        this.width = 100;
        this.height = 100; 
    }
  }

  @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.checkDeviceType();
  } 
}

