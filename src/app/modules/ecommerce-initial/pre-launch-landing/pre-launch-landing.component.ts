import { Component, OnInit, OnDestroy } from '@angular/core';
import { HomeService } from '../../home/_services/home.service';
import { PrelaunchService } from './_services/prelaunch.service';
import { PrelaunchConfigService } from 'src/app/services/prelaunch-config.service';
import { Subscription } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-pre-launch-landing',
  templateUrl: './pre-launch-landing.component.html',
  styleUrls: ['./pre-launch-landing.component.css']
})
export class PreLaunchLandingComponent implements OnInit, OnDestroy {

  locale: string = "";
  country: string = "";

  // Propiedades del componente
  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };

  emailCaptured = false;
  isSubmitting = false;
  showDuplicateMessage = false;
  showResubscribedMessage = false;
  
  // Counter dinámico para validación
  subscriberCount = 0;
  
  // Formulario de captura
  email = '';
  emailError = '';

  // Productos
  previewProducts: any[] = [];
  isLoading = true;
  
  // Countdown
  private countdownInterval: any;
  private launchDate: Date;
  
  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private homeService: HomeService,
    private prelaunchService: PrelaunchService,
    private prelaunchConfigService: PrelaunchConfigService,
    private localizationService: LocalizationService,
    private seoService: SeoService
  ) {

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;

    // ⏰ Fecha de lanzamiento por defecto (se actualizará dinámicamente)
    this.launchDate = new Date('2025-12-13T12:00:00');
    console.log('🚀 Countdown inicial configurado para:', this.launchDate.toLocaleString());
  }

  /**
   * Inicia la cuenta regresiva
   */
  private startCountdown(): void {
    // Actualizar inmediatamente
    this.updateCountdown();
    
    // Actualizar cada segundo
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * Actualiza los valores del countdown
   */
  private updateCountdown(): void {
    const now = new Date().getTime();
    const distance = this.launchDate.getTime() - now;

    if (distance > 0) {
      this.countdown.days = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.countdown.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.countdown.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.countdown.seconds = Math.floor((distance % (1000 * 60)) / 1000);
    } else {
      // El lanzamiento ha llegado
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      this.clearCountdown();
    }
  }

  /**
   * Limpia el interval del countdown
   */
  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Valida el email ingresado
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Captura el email del usuario
   */
  captureEmail() {
    this.emailError = '';
    
    if (!this.email) {
      this.emailError = 'Por favor ingresa tu email';
      return;
    }

    if (!this.validateEmail(this.email)) {
      this.emailError = 'Por favor ingresa un email válido';
      return;
    }

    this.isSubmitting = true;

    // Llamada real al backend
    this.subscriptions.add(
      this.prelaunchService.subscribeEmail(this.email, 'main_form').subscribe({
        next: (response) => {
          console.log('Email capturado exitosamente:', response);
          this.isSubmitting = false;
          this.email = '';
          
          // Detectar si es un email ya registrado
          if (response.data && response.data.already_subscribed) {
            // Email duplicado - mostrar mensaje específico
            this.emailCaptured = true;
            this.showDuplicateMessage = true;
          } else if (response.data && response.data.resubscribed) {
            // Resubscripción de email previamente desuscrito
            this.emailCaptured = true;
            this.showResubscribedMessage = true;
          } else {
            // Registro nuevo exitoso
            this.emailCaptured = true;
            this.showDuplicateMessage = false;
            // Incrementar contador local inmediatamente para mejor UX
            this.subscriberCount++;
          }
          
          // Recargar estadísticas para obtener el número real del servidor
          this.loadSubscriberStats();
        },
        error: (error) => {
          console.error('Error al capturar email:', error);
          this.isSubmitting = false;
          
          if (error.status === 409) {
            // Email ya registrado - mostrar como éxito para mejor UX
            this.emailCaptured = true;
            this.email = '';
          } else {
            this.emailError = 'Error al registrar email. Intenta nuevamente.';
          }
        }
      })
    );
  }

  /**
   * Reset del formulario
   */
  resetForm() {
    this.emailCaptured = false;
    this.showDuplicateMessage = false;
    this.showResubscribedMessage = false;
    this.email = '';
    this.emailError = '';
  }

  /**
   * Scroll suave a sección
   */
  scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  }

  /**
   * Carga las estadísticas de suscriptores
   */
  private loadSubscriberStats(): void {
    this.subscriptions.add(
      this.prelaunchService.getStats().subscribe({
        next: (response) => {
          if (response && response.data && typeof response.data.total === 'number') {
            this.subscriberCount = response.data.total;
          } else if (response && typeof response.total === 'number') {
            this.subscriberCount = response.total;
          }
          console.log('📊 Estadísticas cargadas - Total suscriptores:', this.subscriberCount);
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas de suscriptores:', error);
          // Mantener el valor por defecto de 0 en caso de error
        }
      })
    );
  }

  ngOnInit(): void {
    this.loadLaunchDate();
    this.setupSEO();
    this.loadPreviewProducts();
    this.loadSubscriberStats();
  }

  /**
   * Cargar fecha de lanzamiento dinámicamente desde el backend
   */
  private loadLaunchDate(): void {
    this.subscriptions.add(
      this.prelaunchConfigService.getPrelaunchConfig().subscribe({
        next: (config) => {
          if (config.launch_date) {
            this.launchDate = new Date(config.launch_date);
            console.log('📅 Fecha de lanzamiento cargada dinámicamente:', this.launchDate.toLocaleString());
          } else {
            console.log('⚠️ No hay fecha configurada, usando fecha por defecto');
          }
          // Iniciar countdown después de cargar la fecha
          this.startCountdown();
        },
        error: (error) => {
          console.error('❌ Error cargando fecha de lanzamiento:', error);
          console.log('🔄 Usando fecha por defecto');
          // Iniciar countdown con fecha por defecto en caso de error
          this.startCountdown();
        }
      })
    );
  }

  /**
   * Configura SEO específico para la página de pre-lanzamiento
   */
  setupSEO(): void {
    const seoData = {
      title: 'Coming Soon: Premium Developer Merch & Programming T-Shirts | Developer Store',
      description: 'Exclusive developer merchandise coming soon! Get ready for premium programmer t-shirts, coding hoodies, and funny programming gifts. Join our early access list for special launch discounts.',
      keywords: [
        'developer merch coming soon',
        'programmer t-shirts pre-launch',
        'coding merchandise exclusive',
        'programming gifts early access',
        'developer store launch',
        'programmer clothing premium',
        'coding apparel exclusive',
        'developer gear preview',
        'programming merch collection',
        'funny coding t-shirts',
        'developer swag exclusive',
        'programmer gifts collection',
        'coding humor shirts',
        'development team apparel',
        'software engineer merch'
      ],
      image: '/assets/img/pre-launch-hero.jpg',
      url: window.location.href,
      type: 'prelaunch' as any,
      prelaunch: {
        launchDate: this.launchDate ? this.launchDate.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscriberCount: this.subscriberCount,
        benefits: [
          'Early access to exclusive developer merch',
          'Special launch discount codes',
          'Limited edition programmer t-shirts',
          'Premium coding apparel collection',
          'Funny programming gifts'
        ]
      }
    };

    this.seoService.updateSeo(seoData);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearCountdown();
  }

  /**
   * Carga productos preview del backend
   */
  private loadPreviewProducts(): void {
    const TIME_NOW = new Date().getTime();
    
    this.subscriptions.add(
      this.homeService.listHome(TIME_NOW).subscribe({
        next: (resp: any) => {
          this.processPreviewProducts(resp);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.isLoading = false;
        }
      })
    );
  }

  /**
   * Procesa y filtra productos para preview
   * Toma 1 producto por categoría: camisetas, mugs, hoodies, gorras
   */
  private processPreviewProducts(resp: any): void {
    const products = [];

    // 1. Primer producto de camisetas (our_products)
    if (resp.our_products && resp.our_products.length > 0) {
      const camiseta = { ...resp.our_products[0] };
      camiseta.categoryName = 'Camisetas';
      camiseta.categorySlug = 'camisetas';
      products.push(camiseta);
    }

    // 2. Primer producto de mugs
    if (resp.mugs_products && resp.mugs_products.length > 0) {
      const mug = { ...resp.mugs_products[0] };
      mug.categoryName = 'Mugs';
      mug.categorySlug = 'mugs';
      products.push(mug);
    }

    // 3. Primer producto de hoodies
    if (resp.hoodies_products && resp.hoodies_products.length > 0) {
      const hoodie = { ...resp.hoodies_products[0] };
      hoodie.categoryName = 'Hoodies';
      hoodie.categorySlug = 'hoodies';
      products.push(hoodie);
    }

    // 4. Primer producto de gorras
    if (resp.caps_products && resp.caps_products.length > 0) {
      const gorra = { ...resp.caps_products[0] };
      gorra.categoryName = 'Gorras';
      gorra.categorySlug = 'gorras';
      products.push(gorra);
    }

    this.previewProducts = products;
    console.log('Preview Products:', this.previewProducts);
  }
}