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

  getSliderImage(slider: any): string {
    return window.innerWidth <= 767 ? slider.imagen_mobile_url : slider.imagen_desktop_url;
  }
}
