import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';

export interface PrelaunchResponse {
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

@Injectable({
  providedIn: 'root'
})
export class PrelaunchService {

  private subscribedEmailsSubject = new BehaviorSubject<string[]>([]);
  public subscribedEmails$ = this.subscribedEmailsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Cargar emails guardados en localStorage al inicializar
    this.loadSubscribedEmails();
  }

  /**
   * Suscribir email al pre-launch
   */
  subscribeEmail(email: string, source: 'main_form' | 'cta_final' = 'main_form'): Observable<PrelaunchResponse> {
    const payload = {
      email: email.toLowerCase().trim(),
      source,
      session_id: this.getSessionId()
    };

    return this.http.post<PrelaunchResponse>(`${URL_SERVICE}prelaunch/subscribe`, payload);
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
   * Obtener estadísticas (para admin si es necesario)
   */
  getStats(): Observable<any> {
    return this.http.get(`${URL_SERVICE}prelaunch/stats`);
  }

  /**
   * Generar o recuperar session ID
   */
  private getSessionId(): string {
    let sessionId = localStorage.getItem('prelaunch_session_id');
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('prelaunch_session_id', sessionId);
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
      const stored = localStorage.getItem('prelaunch_subscribed_emails');
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
      localStorage.setItem('prelaunch_subscribed_emails', JSON.stringify(emails));
    } catch (error) {
      console.error('Error saving subscribed emails:', error);
    }
  }

  /**
   * Limpiar datos locales (para testing o reset)
   */
  clearLocalData(): void {
    localStorage.removeItem('prelaunch_subscribed_emails');
    localStorage.removeItem('prelaunch_session_id');
    this.subscribedEmailsSubject.next([]);
  }
}