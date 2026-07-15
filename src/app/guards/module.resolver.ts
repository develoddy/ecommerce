import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ModulesService, ModuleDetailResponse } from '../services/modules.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleResolver implements Resolve<ModuleDetailResponse> {
  // Keys reservadas que no pueden ser módulos (colisionan con rutas existentes)
  private reservedKeys = ['es', 'en', 'fr', 'de', 'it', 'pt', 'labs', 'api', 'preHome', 'admin'];

  constructor(
    private modulesService: ModulesService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<ModuleDetailResponse> {
    const key = route.paramMap.get('moduleKey');

    // Validar que no sea una key reservada
    if (!key || this.reservedKeys.includes(key)) {
      this.router.navigate(['/error/404']);
      return throwError(() => new Error('Reserved or invalid module key'));
    }

    return this.modulesService.getModuleByKey(key).pipe(
      catchError((error) => {
        console.error(`Module ${key} not found or not active`, error);
        this.router.navigate(['/error/404']);
        return throwError(() => error);
      })
    );
  }
}
