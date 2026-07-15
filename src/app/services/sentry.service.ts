import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SentryService {

  constructor() { }

  /**
   * 🚨 Reportar error manual a Sentry
   */
  captureError(error: Error, context?: any): void {
    if (environment.production) {
      Sentry.captureException(error);
      if (context) {
        Sentry.setContext('error_context', context);
      }
    } else {
      // En desarrollo, también loggear a consola
      console.error('🚨 Sentry Error (DEV):', error, context);
    }
  }

  /**
   * 📊 Reportar mensaje informativo
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (environment.production) {
      Sentry.captureMessage(message, level);
    } else {
      console.log(`📊 Sentry Message (${level}):`, message);
    }
  }

  /**
   * 🛍️ Tracking de eventos de e-commerce críticos
   */
  trackEcommerceEvent(event: string, data: any): void {
    try {
      // Setear contexto de usuario si está disponible
      const userId = localStorage.getItem('user_id');
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      // Crear breadcrumb para tracking de flujo
      Sentry.addBreadcrumb({
        message: `E-commerce Event: ${event}`,
        category: 'ecommerce',
        level: 'info',
        data: {
          event,
          timestamp: new Date().toISOString(),
          ...data
        }
      });

      // Solo capturar en producción eventos críticos
      if (environment.production) {
        const criticalEvents = ['purchase_failed', 'payment_error', 'checkout_error'];
        if (criticalEvents.includes(event)) {
          Sentry.captureMessage(`Critical E-commerce Event: ${event}`, 'error');
        }
      }

    } catch (error) {
      console.error('Error tracking ecommerce event:', error);
    }
  }

  /**
   * 🔧 Establecer contexto de usuario
   */
  setUserContext(user: { id?: string; email?: string; role?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role
    });
  }

  /**
   * 🏷️ Establecer tags personalizados
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * 📝 Establecer contexto adicional
   */
  setContext(key: string, context: any): void {
    Sentry.setContext(key, context);
  }

  /**
   * 🧪 Test manual de Sentry (solo desarrollo)
   */
  testSentry(): void {
    if (!environment.production) {
      console.log('🧪 Testing Sentry integration...');
      this.captureMessage('Test message from SentryService', 'info');
      
      // Simular error para testing
      try {
        throw new Error('Test error from SentryService - This is expected in development');
      } catch (error) {
        this.captureError(error as Error, { 
          source: 'manual_test',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.warn('🚫 Sentry test not available in production');
    }
  }
}