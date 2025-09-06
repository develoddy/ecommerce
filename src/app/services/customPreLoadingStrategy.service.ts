import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class CustomPreloadingStrategy implements PreloadingStrategy {

    /**
     * 🚀, vamos a implementar lazy loading optimizado + preloading. La idea es:
     * Lazy load: Todos los módulos grandes (home, shop, account, auth) se cargan solo cuando el usuario accede a ellos.
     *
     * Preloading: Algunos módulos “importantes” (por ejemplo home) se pueden precargar en segundo plano después de que la app 
     * inicial esté lista, para que la navegación sea instantánea sin bloquear la carga inicial.
     * 
     * @param route 
     * @param load 
     * @returns 
     */
    preload(route: Route, load: () => Observable<any>): Observable<any> {
        // Si el módulo tiene data: { preload: true }, lo precargamos
        if (route.data && route.data['preload']) {
            return load();
        } else {
            return of(null);
        }
    }
}
