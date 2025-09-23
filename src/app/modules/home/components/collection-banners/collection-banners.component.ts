import { Component, Input } from '@angular/core';

interface CollectionBanner {
  image: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  position: 'middle-left' | 'middle-right';
  link: string[];
}

@Component({
  selector: 'app-collection-banners',
  templateUrl: './collection-banners.component.html',
  styleUrls: ['./collection-banners.component.scss']
})
export class CollectionBannersComponent {
  @Input() locale: string = '';
  @Input() country: string = '';
  @Input() isVisible: boolean = false;

  banners: CollectionBanner[] = [
    {
      image: 'assets/images/collection/demo1-ct-img1.jpg',
      title: 'Camisetas',
      position: 'middle-right',
      link: ['/', this.locale, this.country, 'shop', 'filter-products']
    },
    {
      image: 'assets/images/collection/demo1-ct-img3.jpg',
      title: 'Jerséis',
      subtitle: 'Jersey en producción',
      buttonText: 'Compra ahora',
      position: 'middle-left',
      link: ['/', this.locale, this.country, 'shop', 'filter-products']
    },
    {
      image: 'assets/images/collection/demo1-ct-img3.jpg',
      title: 'Gorras',
      subtitle: 'Gorra master',
      buttonText: 'Compra ahora',
      position: 'middle-right',
      link: ['/', this.locale, this.country, 'shop', 'filter-products']
    },
    {
      image: 'assets/images/collection/demo1-ct-img2.jpg',
      title: 'Colección',
      position: 'middle-right',
      link: ['/', this.locale, this.country, 'shop', 'filter-products']
    }
  ];

  constructor() { }

  ngOnChanges() {
    // Update banner links when locale/country changes
    this.banners = this.banners.map(banner => ({
      ...banner,
      link: ['/', this.locale, this.country, 'shop', 'filter-products']
    }));
  }

}