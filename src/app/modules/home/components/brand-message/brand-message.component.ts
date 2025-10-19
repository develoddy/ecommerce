import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-brand-message',
  templateUrl: './brand-message.component.html',
  styleUrls: ['./brand-message.component.scss']
})
export class BrandMessageComponent {
  
  @Input() isMobile: boolean = false;
  @Input() isDesktop: boolean = false;

  constructor() { }

}