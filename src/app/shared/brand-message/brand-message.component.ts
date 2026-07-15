import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../modules/auth-profile/_services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { Subject, takeUntil } from 'rxjs';

declare var $: any;

@Component({
  selector: 'app-brand-message',
  templateUrl: './brand-message.component.html',
  styleUrls: ['./brand-message.component.scss']
})
export class BrandMessageComponent implements OnInit, OnDestroy {
  
  @Input() isMobile: boolean = false;
  @Input() isDesktop: boolean = false;

  // Newsletter fields
  email: string = '';
  isGuest: boolean = false;
  isSubmitting: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  errorMessage: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private newsletterService: NewsletterService
  ) { }

  ngOnInit(): void {
    // Detectar si es usuario Guest (no autenticado)
    this._authService.user
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isGuest = !user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSubmitNewsletter(): void {
    // Reset messages
    this.showSuccessMessage = false;
    this.showErrorMessage = false;
    this.errorMessage = '';

    // Validar email
    if (!this.email || this.email.trim() === '') {
      this.errorMessage = 'Por favor, introduce tu email';
      this.showErrorMessage = true;
      return;
    }

    if (!this.validateEmail(this.email)) {
      this.errorMessage = 'Por favor, introduce un email válido';
      this.showErrorMessage = true;
      return;
    }

    // Suscribir usando el servicio (el backend validará si ya está suscrito)
    this.isSubmitting = true;
    
    this.newsletterService.subscribeEmail(this.email, 'home').subscribe({
      next: (resp) => {
        this.isSubmitting = false;
        
        if (resp.status === 200 || resp.status === 201) {
          // Marcar como suscrito localmente para UX
          this.newsletterService.markEmailAsSubscribed(this.email);
          
          this.showSuccessMessage = true;
          const subscribedEmail = this.email;
          this.email = '';
          
          // Mostrar toast de éxito
          if (typeof $ !== 'undefined' && $.notify) {
            $.notify({
              icon: 'fas fa-check',
              message: resp.message || '¡Suscripción exitosa! Revisa tu email.'
            }, {
              type: 'success',
              placement: {
                from: 'top',
                align: 'right'
              },
              time: 1000,
            });
          }

          // Ocultar mensaje después de 5 segundos
          setTimeout(() => {
            this.showSuccessMessage = false;
          }, 5000);
          
          
        } else {
          this.errorMessage = resp.message || 'Ocurrió un error al suscribirte';
          this.showErrorMessage = true;
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Error al suscribirse al newsletter:', error);
        
        this.errorMessage = error.error?.message || 'Error al procesar tu suscripción. Intenta nuevamente.';
        this.showErrorMessage = true;

        // Mostrar toast de error
        if (typeof $ !== 'undefined' && $.notify) {
          $.notify({
            icon: 'fas fa-exclamation-triangle',
            message: this.errorMessage
          }, {
            type: 'danger',
            placement: {
              from: 'top',
              align: 'right'
            },
            time: 1000,
          });
        }
      }
    });
  }

}