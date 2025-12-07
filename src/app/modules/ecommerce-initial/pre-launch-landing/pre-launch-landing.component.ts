import { Component, OnInit, OnDestroy } from '@angular/core';
import { HomeService } from '../../home/_services/home.service';
import { PrelaunchService } from './_services/prelaunch.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pre-launch-landing',
  templateUrl: './pre-launch-landing.component.html',
  styleUrls: ['./pre-launch-landing.component.css']
})
export class PreLaunchLandingComponent implements OnInit, OnDestroy {

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
    private prelaunchService: PrelaunchService
  ) {
    // 🎯 VALIDACIÓN: Countdown hasta 13 diciembre 2025 (7 días de test)
    this.launchDate = new Date('2025-12-13T12:00:00');
    console.log('🚀 Countdown configurado para:', this.launchDate.toLocaleString());
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
          }
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

  ngOnInit(): void {
    this.startCountdown();
    this.loadPreviewProducts();
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