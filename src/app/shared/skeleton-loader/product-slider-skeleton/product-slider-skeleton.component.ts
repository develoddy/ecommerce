import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-product-slider-skeleton',
  templateUrl: './product-slider-skeleton.component.html',
  styleUrls: ['./product-slider-skeleton.component.css']
})
export class ProductSliderSkeletonComponent  {

  @Input() titleWidth: string = '25%';
  @Input() subtitleWidth: string = '50%';
  @Input() itemCount: number = 5;

}
