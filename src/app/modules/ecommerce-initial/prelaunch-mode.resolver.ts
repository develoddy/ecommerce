import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PrelaunchConfigService } from '../../services/prelaunch-config.service';

@Injectable({
  providedIn: 'root'
})
export class PrelaunchModeResolver implements Resolve<any> {

  constructor(private prelaunchConfigService: PrelaunchConfigService) {}

  resolve(): Observable<any> {
    // El estado ya fue cargado en APP_INITIALIZER, solo obtenemos el valor actual
    const isPrelaunchEnabled = this.prelaunchConfigService.getCurrentStatus();
    
    console.log('🔧 PrelaunchModeResolver - Estado:', isPrelaunchEnabled ? 'PRE-LAUNCH' : 'TIENDA COMPLETA');
    
    return of({
      isPrelaunchMode: isPrelaunchEnabled
    });
  }
}