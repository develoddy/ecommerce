import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SubscriptionService {
  private showSubscriptionSectionSubject = new BehaviorSubject<boolean>(true);
  showSubscriptionSection$ = this.showSubscriptionSectionSubject.asObservable();

  setShowSubscriptionSection(value: boolean) {
    this.showSubscriptionSectionSubject.next(value);
  }
}
