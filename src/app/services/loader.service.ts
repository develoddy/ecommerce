import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private pendingRequests = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  show(): void {
    this.pendingRequests++;
    if (this.pendingRequests === 1) {
      this.loadingSubject.next(true);
    }
  }

  hide(): void {
    if (this.pendingRequests > 0) {
      this.pendingRequests--;
    }
    if (this.pendingRequests === 0) {
      this.loadingSubject.next(false);
    }
  }
}