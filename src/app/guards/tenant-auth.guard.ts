import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SaasService } from '../services/saas.service';

@Injectable({
  providedIn: 'root'
})
export class TenantAuthGuard implements CanActivate {

  constructor(
    private saasService: SaasService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    
    // Verificar si hay token
    if (!this.saasService.isAuthenticated()) {
      // Redirigir al login
      const moduleKey = route.params['moduleKey'];
      this.router.navigate(['/labs', moduleKey]);
      return false;
    }

    // Verificar acceso con el backend
    return this.saasService.checkAccess().pipe(
      map(response => {
        if (response.success && response.has_access) {
          return true;
        } else {
          // Token válido pero sin acceso (trial expirado, suscripción cancelada)
          const moduleKey = route.params['moduleKey'];
          this.router.navigate(['/labs', moduleKey], {
            queryParams: { expired: true }
          });
          return false;
        }
      }),
      catchError(error => {
        console.error('Error checking tenant access:', error);
        // Token inválido o error del servidor
        this.saasService.logout();
        const moduleKey = route.params['moduleKey'];
        this.router.navigate(['/labs', moduleKey]);
        return of(false);
      })
    );
  }
}
