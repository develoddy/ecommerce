import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import * as Sentry from '@sentry/angular';
import { Integrations } from '@sentry/tracing';

// 🔒 Sentry optimizado - Solo captura de errores sin interferir con Angular HttpClient
Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  debug: false,
  
  // ❌ SIN BrowserTracing para evitar conflictos con Angular HttpClient
  integrations: [], 
  
  // 🎯 Solo captura de errores, sin performance tracking
  tracesSampleRate: 0,
  
  // 📊 Filtrar errores irrelevantes 
  beforeSend(event: any) {
    // Filtrar errores de HMR y desarrollo
    if (event.exception?.values?.[0]?.value?.includes('sockjs-node') ||
        event.exception?.values?.[0]?.value?.includes('webpack')) {
      return null; // No enviar errores de desarrollo
    }
    
    if (environment.production) {
      return event;
    }
    
    // En desarrollo, loggear errores reales
    console.error('🚨 Sentry Error (DEV):', event);
    return event;
  }
});

// ================================================================
// 🔒 DESACTIVACIÓN DE LOGS EN PRODUCCIÓN (SEGURIDAD)
// ================================================================
if (environment.production) {
  // Desactivar logs que podrían exponer información sensible
  console.log = function () {};
  console.debug = function () {};
  console.info = function () {};
  console.table = function () {};
  
  // Mantener console.warn y console.error para monitoreo
  // console.warn y console.error NO se desactivan
  
  console.warn('🔒 [PRODUCTION MODE] console.log/debug/info/table desactivados por seguridad');
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
