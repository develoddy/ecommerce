import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * Service: SaaS
 * Gestión de trials, autenticación y subscripciones de tenants
 */

export interface TrialStartRequest {
  name: string;
  email: string;
  password: string;
  moduleKey: string;
  plan?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  moduleKey: string;
}

export interface TenantProfile {
  id: number;
  name: string;
  email: string;
  module_key: string;
  plan: string;
  status: 'trial' | 'active' | 'cancelled' | 'suspended' | 'expired';
  trial_ends_at?: string;
  subscribed_at?: string;
  days_remaining?: number;
  has_access?: boolean;
  is_on_trial?: boolean;
}

export interface AuthResponse {
  success: boolean;
  tenant: TenantProfile;
  token: string;
  dashboard_url: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SaasService {
  private apiUrl = `${environment.URL_SERVICE}saas`;
  
  // Estado de autenticación
  private currentTenantSubject = new BehaviorSubject<TenantProfile | null>(null);
  public currentTenant$ = this.currentTenantSubject.asObservable();
  
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Cargar tenant del localStorage si existe
    this.loadStoredTenant();
  }

  /**
   * Iniciar trial gratuito
   */
  startTrial(data: TrialStartRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/trial/start`, data)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            this.handleAuthentication(response);
          }
        })
      );
  }

  /**
   * Login de tenant
   */
  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            this.handleAuthentication(response);
          }
        })
      );
  }

  /**
   * Verificar acceso del tenant actual
   */
  checkAccess(): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-access`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener perfil del tenant autenticado
   */
  getProfile(): Observable<{ success: boolean; tenant: TenantProfile }> {
    return this.http.get<{ success: boolean; tenant: TenantProfile }>(
      `${this.apiUrl}/me`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.success && response.tenant) {
          this.currentTenantSubject.next(response.tenant);
        }
      })
    );
  }

  /**
   * Convertir trial a subscripción pagada
   */
  subscribe(plan: string, stripeSubscriptionId: string, stripePriceId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/subscribe`,
      { plan, stripeSubscriptionId, stripePriceId },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Cancelar subscripción
   */
  cancelSubscription(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/cancel`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('tenant_profile');
    this.tokenSubject.next(null);
    this.currentTenantSubject.next(null);
  }

  /**
   * Verificar si el tenant está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * Obtener tenant actual
   */
  getCurrentTenant(): TenantProfile | null {
    return this.currentTenantSubject.value;
  }

  /**
   * Obtener token almacenado
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('tenant_token');
  }

  /**
   * Cargar tenant del localStorage
   */
  private loadStoredTenant(): void {
    const storedProfile = localStorage.getItem('tenant_profile');
    if (storedProfile) {
      try {
        const tenant = JSON.parse(storedProfile);
        this.currentTenantSubject.next(tenant);
      } catch (error) {
        console.error('Error parsing stored tenant profile:', error);
        localStorage.removeItem('tenant_profile');
      }
    }
  }

  /**
   * Manejar autenticación exitosa
   */
  private handleAuthentication(response: AuthResponse): void {
    // Guardar token
    localStorage.setItem('tenant_token', response.token);
    this.tokenSubject.next(response.token);

    // Guardar perfil
    localStorage.setItem('tenant_profile', JSON.stringify(response.tenant));
    this.currentTenantSubject.next(response.tenant);
  }

  /**
   * Obtener headers de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getStoredToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}
