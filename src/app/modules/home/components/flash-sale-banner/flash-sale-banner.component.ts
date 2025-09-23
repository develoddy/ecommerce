import { Component, Input } from '@angular/core';

interface FlashSale {
  id: number;
  discount: number;
  [key: string]: any;
}

interface TimeLeft {
  [key: number]: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

@Component({
  selector: 'app-flash-sale-banner',
  templateUrl: './flash-sale-banner.component.html',
  styleUrls: ['./flash-sale-banner.component.scss']
})
export class FlashSaleBannerComponent {
  @Input() FlashSales: FlashSale[] = [];
  @Input() timeLeft: TimeLeft | null = null;
  @Input() locale: string = '';
  @Input() country: string = '';

  constructor() { }

}