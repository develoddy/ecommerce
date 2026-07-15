import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PrelaunchStatusResponse {
  status: number;
  enabled: boolean;
  launch_date?: string | null;
  error?: string;
}

export interface PrelaunchConfig {
  enabled: boolean;
  launch_date: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class PrelaunchConfigService {
  private API_URL = environment.URL_SERVICE;
  
  // BehaviorSubject para mantener el estado en caché
  private configSubject = new BehaviorSubject<PrelaunchConfig>({ 
    enabled: false, 
    launch_date: null 
  });
  public prelaunchConfig$ = this.configSubject.asObservable();
  
  // Observable específico para compatibilidad
  public isPrelaunchEnabled$ = this.configSubject.asObservable().pipe(
    map(config => config.enabled)
  );

  constructor(private http: HttpClient) {}

  /**
   * Obtener configuración completa del pre-launch mode
   * @returns Observable<PrelaunchConfig>
   */
  getPrelaunchConfig(): Observable<PrelaunchConfig> {
    return this.http.get<PrelaunchStatusResponse>(`${this.API_URL}prelaunch/status`).pipe(
      map(response => {
        const config: PrelaunchConfig = {
          enabled: response.enabled || false,
          launch_date: response.launch_date ? new Date(response.launch_date) : null
        };
        this.configSubject.next(config);
        return config;
      }),
      catchError(error => {
        console.error('Error obteniendo configuración de pre-launch:', error);
        // En caso de error, asumir deshabilitado por seguridad
        const errorConfig: PrelaunchConfig = { enabled: false, launch_date: null };
        this.configSubject.next(errorConfig);
        return [errorConfig];
      })
    );
  }

  /**
   * Obtener estado actual del pre-launch mode (método de compatibilidad)
   * @returns Observable<boolean>
   */
  getPrelaunchStatus(): Observable<boolean> {
    return this.getPrelaunchConfig().pipe(
      map(config => config.enabled)
    );
  }

  /**
   * Cargar configuración inicial (para APP_INITIALIZER)
   * @returns Promise<boolean>
   */
  loadInitialConfig(): Promise<boolean> {
    return new Promise((resolve) => {
      this.getPrelaunchConfig().subscribe({
        next: (config) => {
          console.log('🔧 PrelaunchConfig cargado:', config.enabled ? 'HABILITADO' : 'DESHABILITADO');
          if (config.launch_date) {
            console.log('📅 Fecha de lanzamiento:', config.launch_date.toLocaleString());
          }
          resolve(config.enabled);
        },
        error: (error) => {
          console.error('❌ Error cargando configuración inicial de pre-launch:', error);
          resolve(false); // Por defecto deshabilitado
        }
      });
    });
  }

  /**
   * Obtener configuración actual desde caché (sin hacer nueva petición HTTP)
   * @returns PrelaunchConfig
   */
  getCurrentConfig(): PrelaunchConfig {
    return this.configSubject.value;
  }

  /**
   * Obtener estado actual desde caché (sin hacer nueva petición HTTP)
   * @returns boolean
   */
  getCurrentStatus(): boolean {
    return this.configSubject.value.enabled;
  }

  /**
   * Obtener fecha de lanzamiento actual desde caché
   * @returns Date | null
   */
  getLaunchDate(): Date | null {
    return this.configSubject.value.launch_date || null;
  }

  /**
   * Forzar actualización del estado
   */
  refreshStatus(): void {
    this.getPrelaunchConfig().subscribe();
  }
}