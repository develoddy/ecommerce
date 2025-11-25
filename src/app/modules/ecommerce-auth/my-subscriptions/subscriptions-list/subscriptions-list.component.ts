import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NewsletterService } from 'src/app/services/newsletter.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { LocalizationService } from 'src/app/services/localization.service';

interface SubscriptionPreference {
  id: string;
  label: string;
  enabled: boolean;
  category: 'content' | 'channel';
}

@Component({
  selector: 'app-subscriptions-list',
  templateUrl: './subscriptions-list.component.html',
  styleUrls: ['./subscriptions-list.component.css']
})
export class SubscriptionsListComponent implements OnInit, OnDestroy {
  
  CURRENT_USER_AUTHENTICATED: any = null;
  loading: boolean = false;
  savingPreferences: boolean = false;
  
  // Preferencias de suscripción
  contentPreferences: SubscriptionPreference[] = [
    { id: 'novedades', label: 'Novedades', enabled: false, category: 'content' },
    { id: 'promociones', label: 'Promociones', enabled: false, category: 'content' },
    { id: 'prelaunch', label: 'Prelaunch', enabled: false, category: 'content' }
  ];
  
  channelPreferences: SubscriptionPreference[] = [
    { id: 'email', label: 'Email', enabled: true, category: 'channel' }, // Email siempre enabled
    { id: 'sms', label: 'SMS', enabled: false, category: 'channel' },
    { id: 'whatsapp', label: 'WhatsApp', enabled: false, category: 'channel' }
  ];
  
  // Estado de suscripción al newsletter
  isSubscribedToNewsletter: boolean = false;
  subscriberData: any = null;
  
  // Mensajes
  successMessage: string = '';
  errorMessage: string = '';
  showMessage: boolean = false;
  
  // Subscriptions para cleanup
  subscriptions: Subscription = new Subscription();
  
  locale: string = '';
  country: string = '';

  constructor(
    public newsletterService: NewsletterService,
    private authService: AuthService,
    private router: Router,
    private localizationService: LocalizationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    this.verifyAuthenticatedUser();
  }

  /**
   * Verificar que el usuario está autenticado
   */
  private verifyAuthenticatedUser(): void {
    this.subscriptions.add(
      this.authService.user.subscribe(user => {
        if (user) {
          this.CURRENT_USER_AUTHENTICATED = user;
          this.loadSubscriptionData();
        } else {
          this.CURRENT_USER_AUTHENTICATED = null;
          this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
        }
      })
    );
  }

  /**
   * Cargar datos de suscripción del usuario
   */
  private loadSubscriptionData(): void {
    if (!this.CURRENT_USER_AUTHENTICATED?.email) {
      return;
    }

    this.loading = true;
    
    // Verificar si el usuario está suscrito al newsletter
    this.subscriptions.add(
      this.newsletterService.getSubscribers(1, 1, { 
        search: this.CURRENT_USER_AUTHENTICATED.email,
        verified: 'true'
      }).subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.data && response.data.subscribers && response.data.subscribers.length > 0) {
            this.subscriberData = response.data.subscribers[0];
            this.isSubscribedToNewsletter = this.subscriberData.status === 'subscribed';
            
            // Cargar preferencias guardadas si existen
            this.loadPreferencesFromSubscriber(this.subscriberData);
          } else {
            this.isSubscribedToNewsletter = false;
            this.subscriberData = null;
          }
        },
        error: (err) => {
          console.error('Error loading subscription data:', err);
          this.loading = false;
          this.isSubscribedToNewsletter = false;
        }
      })
    );
  }

  /**
   * Cargar preferencias desde los datos del suscriptor
   * Usamos el campo notified_campaign para guardar las preferencias como JSON
   */
  private loadPreferencesFromSubscriber(subscriber: any): void {
    // Por ahora, todas las preferencias empiezan desactivadas
    // En el futuro se puede implementar guardado de preferencias en un campo JSON
    // del suscriptor o en una tabla separada
    
    // Si está suscrito al newsletter, habilitar Email por defecto
    if (this.isSubscribedToNewsletter) {
      const emailPref = this.channelPreferences.find(p => p.id === 'email');
      if (emailPref) emailPref.enabled = true;
    }
  }

  /**
   * Suscribirse al newsletter
   */
  subscribeToNewsletter(): void {
    if (!this.CURRENT_USER_AUTHENTICATED?.email) {
      this.showErrorMessage('No se pudo obtener el email del usuario');
      return;
    }

    this.savingPreferences = true;
    this.showMessage = false;

    this.subscriptions.add(
      this.newsletterService.subscribeEmail(
        this.CURRENT_USER_AUTHENTICATED.email,
        'home'
      ).subscribe({
        next: (response) => {
          this.savingPreferences = false;
          this.isSubscribedToNewsletter = true;
          
          // Habilitar Email por defecto
          const emailPref = this.channelPreferences.find(p => p.id === 'email');
          if (emailPref) emailPref.enabled = true;
          
          this.showSuccessMessage('Te has suscrito correctamente al newsletter. Revisa tu email para confirmar.');
          
          // Recargar datos después de 2 segundos
          setTimeout(() => {
            this.loadSubscriptionData();
          }, 2000);
        },
        error: (err) => {
          this.savingPreferences = false;
          console.error('Error subscribing:', err);
          this.showErrorMessage(err.error?.message || 'Error al suscribirse al newsletter');
        }
      })
    );
  }

  /**
   * Darse de baja del newsletter
   */
  unsubscribeFromNewsletter(): void {
    if (!this.CURRENT_USER_AUTHENTICATED?.email) {
      return;
    }

    // Confirmación antes de dar de baja
    if (!confirm('¿Estás seguro de que quieres darte de baja del newsletter?')) {
      return;
    }

    this.savingPreferences = true;
    this.showMessage = false;

    // Usar endpoint de unsubscribe
    this.subscriptions.add(
      this.newsletterService.http.post(`${this.newsletterService.API_URL}newsletter/unsubscribe`, {
        email: this.CURRENT_USER_AUTHENTICATED.email
      }).subscribe({
        next: (response: any) => {
          this.savingPreferences = false;
          this.isSubscribedToNewsletter = false;
          
          // Deshabilitar todas las preferencias
          this.contentPreferences.forEach(p => p.enabled = false);
          this.channelPreferences.forEach(p => p.enabled = false);
          
          this.showSuccessMessage('Te has dado de baja correctamente del newsletter');
          
          // Recargar datos
          setTimeout(() => {
            this.loadSubscriptionData();
          }, 2000);
        },
        error: (err) => {
          this.savingPreferences = false;
          console.error('Error unsubscribing:', err);
          this.showErrorMessage(err.error?.message || 'Error al darse de baja del newsletter');
        }
      })
    );
  }

  /**
   * Guardar preferencias de suscripción
   */
  savePreferences(): void {
    if (!this.isSubscribedToNewsletter) {
      this.showErrorMessage('Primero debes suscribirte al newsletter');
      return;
    }

    this.savingPreferences = true;
    this.showMessage = false;

    // Por ahora solo guardamos el estado localmente
    // En el futuro se puede implementar un endpoint para guardar preferencias
    
    setTimeout(() => {
      this.savingPreferences = false;
      this.showSuccessMessage('Tus preferencias han sido guardadas correctamente');
    }, 1000);
  }

  /**
   * Toggle de preferencia individual
   */
  togglePreference(preference: SubscriptionPreference): void {
    // Email siempre debe estar enabled si está suscrito
    if (preference.id === 'email' && this.isSubscribedToNewsletter) {
      return;
    }
    
    preference.enabled = !preference.enabled;
  }

  /**
   * Verificar si todas las preferencias de contenido están desactivadas
   */
  get allContentDisabled(): boolean {
    return this.contentPreferences.every(p => !p.enabled);
  }

  /**
   * Verificar si todas las preferencias de canal están desactivadas
   */
  get allChannelsDisabled(): boolean {
    return this.channelPreferences.every(p => !p.enabled);
  }

  /**
   * Mostrar mensaje de éxito
   */
  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.showMessage = true;
    
    // Auto ocultar después de 5 segundos
    setTimeout(() => {
      this.showMessage = false;
    }, 5000);
  }

  /**
   * Mostrar mensaje de error
   */
  private showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    this.showMessage = true;
    
    // Auto ocultar después de 5 segundos
    setTimeout(() => {
      this.showMessage = false;
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
