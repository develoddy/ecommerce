import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HeaderEventsService {
  private forceLoginSubject = new Subject<void>();
  forceLogin$ = this.forceLoginSubject.asObservable();

  emitForceLogin() {
    this.forceLoginSubject.next();
  }
}
