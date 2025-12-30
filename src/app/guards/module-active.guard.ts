import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ModulesService } from '../services/modules.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleActiveGuard implements CanActivate {
  constructor(
    private modulesService: ModulesService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const key = route.paramMap.get('moduleKey');

    if (!key) {
      this.router.navigate(['/error/404']);
      return of(false);
    }

    return this.modulesService.getModuleByKey(key).pipe(
      map((response) => {
        const module = response.module;
        
        // Validar que el módulo esté activo y en estado 'live'
        if (!module.is_active || module.status !== 'live') {
          console.warn(`Module ${key} is not active or not live`);
          this.router.navigate(['/error/404']);
          return false;
        }

        return true;
      }),
      catchError((error) => {
        console.error(`Error checking module ${key} status`, error);
        this.router.navigate(['/error/404']);
        return of(false);
      })
    );
  }
}
