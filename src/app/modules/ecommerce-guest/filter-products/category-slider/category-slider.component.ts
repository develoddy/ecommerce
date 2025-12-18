import { Component, Input } from '@angular/core';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';

@Component({
  selector: 'app-category-slider',
  templateUrl: './category-slider.component.html',
  styleUrls: ['./category-slider.component.css']
})
export class CategorySliderComponent {
  @Input() categories: any[] = [];

  constructor(public dynamicRouter: DynamicRouterService) {}
}
