import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Module {
  id: number;
  key: string;
  name: string;
  description: string;
  type: 'physical' | 'digital' | 'service';
  icon: string;
  color: string;
  target_sales: number;
  validation_days: number;
  price_base: number;
  is_active: boolean;
  status: 'draft' | 'testing' | 'live' | 'archived';
  launched_at?: string;
  validated_at?: string;
  archived_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleStats {
  totalSales: number;
  totalRevenue: number;
  progress: number;
}

export interface ModuleValidationStatus {
  isValidated: boolean;
  daysRemaining: number;
  launchedAt: string;
  validationDeadline: string;
}

export interface ModuleDetailResponse {
  module: Module;
  stats: ModuleStats;
  validationStatus?: ModuleValidationStatus;
  recentSales: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private apiUrl = `${environment.URL_SERVICE}modules/public`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los módulos activos y en estado 'live'
   */
  getActiveModules(): Observable<Module[]> {
    return this.http.get<Module[]>(this.apiUrl);
  }

  /**
   * Obtiene un módulo específico por su key
   */
  getModuleByKey(key: string): Observable<ModuleDetailResponse> {
    return this.http.get<ModuleDetailResponse>(`${this.apiUrl}/${key}`);
  }

  /**
   * Formatea moneda para mostrar
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  /**
   * Calcula el progreso porcentual
   */
  calculateProgress(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  /**
   * Retorna la clase CSS para badges según el status
   */
  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      draft: 'badge-secondary',
      testing: 'badge-warning',
      live: 'badge-success',
      archived: 'badge-dark'
    };
    return classes[status] || 'badge-secondary';
  }

  /**
   * Retorna la clase CSS para badges según el tipo
   */
  getTypeBadgeClass(type: string): string {
    const classes: { [key: string]: string } = {
      physical: 'badge-primary',
      digital: 'badge-info',
      service: 'badge-purple'
    };
    return classes[type] || 'badge-secondary';
  }
}
