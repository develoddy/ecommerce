import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
// Función global del slider de categorías (definida en main.js) y jQuery
declare var collection_slider_8items: any;
declare var $: any;

@Component({
  selector: 'app-category-slider',
  templateUrl: './category-slider.component.html',
  styleUrls: ['./category-slider.component.css']
})
export class CategorySliderComponent /*implements OnChanges , AfterViewInit*/ {
  @Input() categories: any[] = [];
  @Input() locale: string = '';
  @Input() country: string = '';

  // ngAfterViewInit(): void {
  //   // Inicializar slider al montar el componente
  //   if (this.categories && this.categories.length > 0) {
  //     setTimeout(() => {
  //       collection_slider_8items();
  //     }, 50);
  //   }
  // }

  // ngOnChanges(changes: SimpleChanges): void {
  //   if (changes.categories && !changes.categories.firstChange) {
  //     // Destruir slider anterior y volver a inicializar
  //     setTimeout(() => {
  //       if ($ && $('.collection-slider-8items').hasClass('slick-initialized')) {
  //         $('.collection-slider-8items').slick('unslick');
  //       }
  //       collection_slider_8items();
  //     }, 50);
  //   }
  // }
}
