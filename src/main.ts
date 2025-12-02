import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

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
