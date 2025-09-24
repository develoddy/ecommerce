import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, EMPTY } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface FlashSaleTimer {
  id: string;
  timeLeft: TimeLeft;
  isExpired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlashSaleTimerService {

  private timers = new Map<string, any>();
  private timerSubjects = new Map<string, BehaviorSubject<TimeLeft>>();
  private timersInitialized = false;

  constructor() { }

  /**
   * Inicializa todos los timers para las Flash Sales activas
   * @param flashSales Array de Flash Sales
   * @returns Observable con todos los timers
   */
  initializeTimers(flashSales: any[]): Observable<{[flashId: string]: TimeLeft}> {
    // Evitar inicialización múltiple
    if (this.timersInitialized) {
      console.log('⚠️ Timers ya están inicializados, cancelando inicialización duplicada');
      return this.getAllTimersObservable();
    }

    console.log('🕐 Iniciando timers para Flash Sales:', flashSales);
    this.clearAllTimers();

    if (!flashSales || flashSales.length === 0) {
      return EMPTY;
    }

    // Crear subjects y timers para cada Flash Sale
    flashSales.forEach(flash => {
      if (flash.end_date) {
        this.createTimerForFlashSale(flash);
      } else {
        console.log(`❌ Flash Sale ${flash.id} no tiene end_date`);
      }
    });

    this.timersInitialized = true;
    return this.getAllTimersObservable();
  }

  /**
   * Crea un timer para una Flash Sale específica
   * @param flash Flash Sale object
   */
  private createTimerForFlashSale(flash: any): void {
    console.log(`🕐 Configurando timer para Flash Sale ${flash.id}, end_date: ${flash.end_date}`);
    
    const endDate = new Date(flash.end_date).getTime();
    const now = new Date().getTime();
    const initialDistance = endDate - now;

    console.log(`🕐 Flash Sale ${flash.id}: endDate=${endDate}, now=${now}, distance=${initialDistance}`);

    // Crear BehaviorSubject para este timer
    const initialTimeLeft = this.calculateTimeLeft(initialDistance);
    const timerSubject = new BehaviorSubject<TimeLeft>(initialTimeLeft);
    this.timerSubjects.set(flash.id, timerSubject);

    // Si ya expiró, no crear interval
    if (initialDistance <= 0) {
      //console.log(`⏰ Timer ya expirado para Flash Sale ${flash.id}`);
      return;
    }

    // Crear interval para actualizar cada segundo
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate - now;

      if (distance <= 0) {
        // Timer expirado
        const expiredTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        timerSubject.next(expiredTimeLeft);
        this.clearTimer(flash.id);
        //console.log(`⏰ Timer expired for Flash Sale ${flash.id}`);
      } else {
        // Actualizar tiempo restante
        const timeLeft = this.calculateTimeLeft(distance);
        timerSubject.next(timeLeft);
        // Log solo cada 30 segundos para evitar spam
        if (timeLeft.seconds % 30 === 0) {
          //console.log(`⏰ Flash Sale ${flash.id} time left:`, timeLeft);
        }
      }
    }, 1000);

    this.timers.set(flash.id, timer);
  }

  /**
   * Calcula el tiempo restante basado en la distancia en milisegundos
   * @param distance Distancia en milisegundos
   * @returns Objeto TimeLeft
   */
  private calculateTimeLeft(distance: number): TimeLeft {
    if (distance <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    };
  }

  /**
   * Obtiene el Observable para un timer específico
   * @param flashId ID de la Flash Sale
   * @returns Observable del timer o undefined
   */
  getTimerObservable(flashId: string): Observable<TimeLeft> | undefined {
    const subject = this.timerSubjects.get(flashId);
    return subject ? subject.asObservable() : undefined;
  }

  /**
   * Obtiene un Observable que combina todos los timers
   * @returns Observable con objeto que contiene todos los timers
   */
  getAllTimersObservable(): Observable<{[flashId: string]: TimeLeft}> {
    const allTimersSubject = new BehaviorSubject<{[flashId: string]: TimeLeft}>({});

    // Combinar todos los subjects
    const updateAllTimers = () => {
      const allTimers: {[flashId: string]: TimeLeft} = {};
      this.timerSubjects.forEach((subject, flashId) => {
        allTimers[flashId] = subject.getValue();
      });
      allTimersSubject.next(allTimers);
    };

    // Suscribirse a cambios en cada timer
    this.timerSubjects.forEach((subject, flashId) => {
      subject.subscribe(() => updateAllTimers());
    });

    // Actualización inicial
    updateAllTimers();

    return allTimersSubject.asObservable();
  }

  /**
   * Obtiene el estado actual de un timer específico
   * @param flashId ID de la Flash Sale
   * @returns TimeLeft actual o null
   */
  getCurrentTimeLeft(flashId: string): TimeLeft | null {
    const subject = this.timerSubjects.get(flashId);
    return subject ? subject.getValue() : null;
  }

  /**
   * Obtiene el estado actual de todos los timers
   * @returns Objeto con todos los timers actuales
   */
  getAllCurrentTimers(): {[flashId: string]: TimeLeft} {
    const allTimers: {[flashId: string]: TimeLeft} = {};
    this.timerSubjects.forEach((subject, flashId) => {
      allTimers[flashId] = subject.getValue();
    });
    return allTimers;
  }

  /**
   * Limpia un timer específico
   * @param flashId ID de la Flash Sale
   */
  clearTimer(flashId: string): void {
    const timer = this.timers.get(flashId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(flashId);
    }

    const subject = this.timerSubjects.get(flashId);
    if (subject) {
      subject.complete();
      this.timerSubjects.delete(flashId);
    }
  }

  /**
   * Limpia todos los timers
   */
  clearAllTimers(): void {
    console.log('🧹 Limpiando todos los timers de Flash Sales');
    
    // Limpiar intervals
    this.timers.forEach((timer, flashId) => {
      clearInterval(timer);
    });
    this.timers.clear();

    // Completar y limpiar subjects
    this.timerSubjects.forEach((subject, flashId) => {
      subject.complete();
    });
    this.timerSubjects.clear();

    this.timersInitialized = false;
  }

  /**
   * Verifica si los timers están inicializados
   * @returns true si están inicializados
   */
  areTimersInitialized(): boolean {
    return this.timersInitialized;
  }

  /**
   * Verifica si un timer específico está activo
   * @param flashId ID de la Flash Sale
   * @returns true si el timer está activo
   */
  isTimerActive(flashId: string): boolean {
    return this.timers.has(flashId) && this.timerSubjects.has(flashId);
  }

  /**
   * Obtiene la cantidad de timers activos
   * @returns Número de timers activos
   */
  getActiveTimersCount(): number {
    return this.timers.size;
  }
}