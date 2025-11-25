import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';
import { AuthService } from '../modules/auth-profile/_services/auth.service';

export interface NewsletterResponse {
  status: number;
  message: string;
  data?: {
    email: string;
    source?: string;
    subscribed_at?: string;
    already_subscribed?: boolean;
    resubscribed?: boolean;
  };
}

export interface NewsletterStats {
  total: number;
  verified: number;
  unsubscribed: number;
  bounced: number;
  by_source: { [key: string]: number };
  by_date: { [key: string]: number };
  conversion_rate: string;
  recent_campaigns?: any[];
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  source: string;
  status: string;
  email_verified: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {

  private subscribedEmailsSubject = new BehaviorSubject<string[]>([]);
  public subscribedEmails$ = this.subscribedEmailsSubject.asObservable();
  
  // Exponer URL_SERVICE para uso en componentes
  public readonly API_URL = URL_SERVICE;

  constructor(
    public http: HttpClient, // Public para acceso en componentes
    private authService: AuthService
  ) {
    // Cargar emails guardados en localStorage al inicializar
    this.loadSubscribedEmails();
  }

  /**
   * Suscribir email al newsletter
   */
  subscribeEmail(email: string, source: 'home' | 'footer' | 'checkout' = 'home'): Observable<NewsletterResponse> {
    const payload = {
      email: email.toLowerCase().trim(),
      source,
      session_id: this.getSessionId()
    };

    return this.http.post<NewsletterResponse>(`${URL_SERVICE}newsletter/subscribe`, payload);
  }

  /**
   * Marcar email como suscrito localmente (para UX)
   */
  markEmailAsSubscribed(email: string): void {
    const currentEmails = this.subscribedEmailsSubject.value;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!currentEmails.includes(normalizedEmail)) {
      const updatedEmails = [...currentEmails, normalizedEmail];
      this.subscribedEmailsSubject.next(updatedEmails);
      this.saveSubscribedEmails(updatedEmails);
    }
  }

  /**
   * Verificar si un email ya está suscrito localmente
   */
  isEmailSubscribed(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    return this.subscribedEmailsSubject.value.includes(normalizedEmail);
  }

  /**
   * Obtener estadísticas (ADMIN - requiere token)
   */
  getStats(): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders().set('token', token || '');
    return this.http.get(`${URL_SERVICE}newsletter/admin/stats`, { headers });
  }

  /**
   * Obtener lista de suscriptores (ADMIN - requiere token)
   */
  getSubscribers(page: number = 1, limit: number = 50, filters?: any): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders().set('token', token || '');
    
    let params: any = { page, limit };
    if (filters) {
      params = { ...params, ...filters };
    }

    return this.http.get(`${URL_SERVICE}newsletter/admin/subscribers`, { 
      headers,
      params 
    });
  }

  /**
   * Exportar suscriptores a CSV (ADMIN - requiere token)
   */
  exportSubscribers(): Observable<Blob> {
    const token = this.authService.token;
    const headers = new HttpHeaders().set('token', token || '');
    
    return this.http.get(`${URL_SERVICE}newsletter/admin/export`, {
      headers,
      responseType: 'blob'
    });
  }

  /**
   * Crear campaña (ADMIN - requiere token)
   */
  createCampaign(campaignData: any): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders()
      .set('token', token || '')
      .set('Content-Type', 'application/json');
    
    return this.http.post(`${URL_SERVICE}newsletter/admin/campaigns/create`, campaignData, { headers });
  }

  /**
   * Enviar emails de prueba (ADMIN - requiere token)
   */
  sendTestEmails(subject: string, htmlBody: string, testEmails: string[]): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders()
      .set('token', token || '')
      .set('Content-Type', 'application/json');
    
    return this.http.post(`${URL_SERVICE}newsletter/admin/campaigns/send-test`, {
      subject,
      htmlBody,
      testEmails
    }, { headers });
  }

  /**
   * Enviar campaña real (ADMIN - requiere token)
   */
  sendCampaign(campaignData: any): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders()
      .set('token', token || '')
      .set('Content-Type', 'application/json');
    
    return this.http.post(`${URL_SERVICE}newsletter/admin/campaigns/send`, campaignData, { headers });
  }

  /**
   * Preview de campaña (ADMIN - requiere token)
   */
  previewCampaign(htmlBody: string): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders()
      .set('token', token || '')
      .set('Content-Type', 'application/json');
    
    return this.http.post(`${URL_SERVICE}newsletter/admin/campaigns/preview`, { htmlBody }, { headers });
  }

  /**
   * Obtener campañas (ADMIN - requiere token)
   */
  getCampaigns(page: number = 1, limit: number = 20, status?: string): Observable<any> {
    const token = this.authService.token;
    const headers = new HttpHeaders().set('token', token || '');
    
    let params: any = { page, limit };
    if (status) params.status = status;

    return this.http.get(`${URL_SERVICE}newsletter/admin/campaigns`, { 
      headers,
      params 
    });
  }

  /**
   * Generar o recuperar session ID
   */
  private getSessionId(): string {
    let sessionId = localStorage.getItem('newsletter_session_id');
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('newsletter_session_id', sessionId);
    }
    
    return sessionId;
  }

  /**
   * Generar un session ID único
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2);
    return `${timestamp}-${randomStr}`;
  }

  /**
   * Cargar emails suscritos desde localStorage
   */
  private loadSubscribedEmails(): void {
    try {
      const stored = localStorage.getItem('newsletter_subscribed_emails');
      if (stored) {
        const emails = JSON.parse(stored);
        this.subscribedEmailsSubject.next(emails);
      }
    } catch (error) {
      console.error('Error loading subscribed emails:', error);
    }
  }

  /**
   * Guardar emails suscritos en localStorage
   */
  private saveSubscribedEmails(emails: string[]): void {
    try {
      localStorage.setItem('newsletter_subscribed_emails', JSON.stringify(emails));
    } catch (error) {
      console.error('Error saving subscribed emails:', error);
    }
  }

  /**
   * Limpiar datos locales (para testing o reset)
   */
  clearLocalData(): void {
    localStorage.removeItem('newsletter_subscribed_emails');
    localStorage.removeItem('newsletter_session_id');
    this.subscribedEmailsSubject.next([]);
  }
}
