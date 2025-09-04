import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-category-slider',
  templateUrl: './category-slider.component.html',
  styleUrls: ['./category-slider.component.css']
})
export class CategorySliderComponent {
  @Input() categories: any[] = [];
  @Input() locale: string = '';
  @Input() country: string = '';
}
