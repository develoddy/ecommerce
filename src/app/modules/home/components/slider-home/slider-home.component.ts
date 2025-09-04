import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-slider-home',
  templateUrl: './slider-home.component.html',
  styleUrls: ['./slider-home.component.scss']
})
export class SliderHomeComponent {
  @Input() sliders: any[] = [];
  @Input() locale: string = '';
  @Input() country: string = '';
}
