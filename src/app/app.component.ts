import { AfterViewInit, Component, OnInit, HostListener } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizationService } from './services/localization.service';
import { GuestCleanupService } from './modules/ecommerce-guest/_service/guestCleanup.service';
import { HeaderEventsService } from './services/headerEvents.service';
import { CookieConsentService } from './services/cookie-consent.service';
declare var bootstrap: any;

declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;//declare function HOMEINITTEMPLATE([]):any;
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
  isDesktop: boolean = false;
  width: number = 100; 
  height: number = 100; 

  constructor(
    private translate: TranslateService, 
    private router: Router,
    private titleService: Title, 
    private bodyClassService: BodyClassService,
    private localizationService: LocalizationService,
    private headerEventsService: HeaderEventsService,
    private guestCleanupService: GuestCleanupService,
    private cookieConsentService: CookieConsentService,
  ) {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translate.get('app.title').subscribe((res: string) => {
        this.titleService.setTitle(res);
      });
    });

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngAfterViewInit(): void {
    const consentGiven = this.cookieConsentService.hasUserConsented();
    if (!consentGiven) {
      const modalElement = document.getElementById('cookie_modal');
      if (modalElement) {
        this.modalInstance = new bootstrap.Modal(modalElement);
        this.modalInstance.show();
      }
    }
  }

  ngOnInit(): void {
    this.bodyClassService.updateBodyClass("index-demo1");
    this.headerEventsService.forceLogin$.subscribe(() => {
      this.handleForceLogin();
    });
    this.checkDeviceType();
  }

  

  handleForceLogin() {
    this.router.navigate(['/', this.country, this.locale,  'auth', 'login']).then(() => {window.location.reload();});
  }

  acceptCookies() {
    this.cookieConsentService.setConsent('accepted');
    this.modalInstance?.hide();
    // Cargar scripts de terceros si lo deseas aquí
  }

  rejectCookies() {
    this.cookieConsentService.setConsent('rejected');
    this.modalInstance?.hide();
  }

  gotoPoliticaCookie() {
    this.router.navigate(['/', this.locale, this.country, 'shop', 'privacy-policy']);
    this.modalInstance?.hide();
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    // Ajusta el tamaño de la imagen según el tipo de dispositivo
    if (this.isMobile) {
        this.width = 80;  // tamaño para móviles
        this.height = 80; // tamaño para móviles
    } else {
        this.width = 100; // tamaño por defecto
        this.height = 100; // tamaño por defecto
    }
  }

  @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.checkDeviceType(); // Verifica el tamaño de la pantalla
  } 
}

