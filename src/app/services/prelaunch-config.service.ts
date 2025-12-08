import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PrelaunchStatusResponse {
  status: number;
  enabled: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrelaunchConfigService {
  private API_URL = environment.URL_SERVICE;
  
  // BehaviorSubject para mantener el estado en caché
  private configSubject = new BehaviorSubject<boolean>(false);
  public isPrelaunchEnabled$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener estado actual del pre-launch mode
   * @returns Observable<boolean>
   */
  getPrelaunchStatus(): Observable<boolean> {
    return this.http.get<PrelaunchStatusResponse>(`${this.API_URL}/prelaunch/status`).pipe(
      map(response => {
        const enabled = response.enabled || false;
        this.configSubject.next(enabled);
        return enabled;
      }),
      catchError(error => {
        console.error('Error obteniendo estado de pre-launch:', error);
        // En caso de error, asumir deshabilitado por seguridad
        this.configSubject.next(false);
        return [false];
      })
    );
  }

  /**
   * Cargar configuración inicial (para APP_INITIALIZER)
   * @returns Promise<boolean>
   */
  loadInitialConfig(): Promise<boolean> {
    return new Promise((resolve) => {
      this.getPrelaunchStatus().subscribe({
        next: (enabled) => {
          console.log('🔧 PrelaunchConfig cargado:', enabled ? 'HABILITADO' : 'DESHABILITADO');
          resolve(enabled);
        },
        error: (error) => {
          console.error('❌ Error cargando configuración inicial de pre-launch:', error);
          resolve(false); // Por defecto deshabilitado
        }
      });
    });
  }

  /**
   * Obtener estado actual desde caché (sin hacer nueva petición HTTP)
   * @returns boolean
   */
  getCurrentStatus(): boolean {
    return this.configSubject.value;
  }

  /**
   * Forzar actualización del estado
   */
  refreshStatus(): void {
    this.getPrelaunchStatus().subscribe();
  }
}