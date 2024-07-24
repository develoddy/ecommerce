import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BodyClassService {

  //private renderer: Renderer2;

  constructor(private router: Router, rendererFactory: RendererFactory2) {
    // this.renderer = rendererFactory.createRenderer(null, null);
    // this.router.events.subscribe(event => {
    //   if (event instanceof NavigationEnd) {
    //     this.updateBodyClass(event.urlAfterRedirects);
    //   }
    // });
  }

  // private updateBodyClass(url: string) {
  //   // Reset body classes

  //   // Home
  //   this.renderer.removeClass(document.body, 'index-demo1');
  //   this.renderer.removeClass(document.body, 'template-index');

  //   // Landing
  //   this.renderer.removeClass(document.body, 'template-product');
  //   this.renderer.removeClass(document.body, 'product-layout1');

  //   // Wishlist
  //   this.renderer.removeClass(document.body, 'wishlist-page');
  //   this.renderer.removeClass(document.body, 'wishlist-style1-page');

  //   // Filter
  //   this.renderer.removeClass(document.body, 'shop-page');
  //   this.renderer.removeClass(document.body, 'sidebar-filter');
  //   this.renderer.removeClass(document.body, 'shop-grid-view-page');
    

  //   // Add the relevant class based on the URL
  //   if (url === '/') {
  //     this.renderer.addClass(document.body, 'template-index');
  //     this.renderer.addClass(document.body, 'index-demo1');
      
  //   } else if (url.includes('wishlist')) {
  //     this.renderer.addClass(document.body, 'wishlist-page');
  //     this.renderer.addClass(document.body, 'wishlist-style1-page');

  //   } else if (url.includes('filter-products')) { 
  //     this.renderer.addClass(document.body, 'shop-page');
  //     this.renderer.addClass(document.body, 'sidebar-filter');
  //     this.renderer.addClass(document.body, 'shop-grid-view-page');

  //   } else if (/\/landing-product\/[^\/]+/.test(url)) {
  //     this.renderer.addClass(document.body, 'template-product');
  //     this.renderer.addClass(document.body, 'product-layout1');
  //   }
  // }
}
