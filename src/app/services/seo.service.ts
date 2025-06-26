import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {}

  updateSeo(data: { title: string; description: string; image?: string }) {
    const { title, description, image } = data;
    //const url = 'https://tienda.lujandev.com/' + this.router.url;
    const domain = 'https://tienda.lujandev.com'; // ✅ cambia si es necesario
    const cleanPath = this.router.url.split('?')[0]; // ✅ sin parámetros
    const fullUrl = `${domain}${cleanPath}`;

    // Title y description
    this.titleService.setTitle(`${title} | LujanDev Oficial`);
    this.metaService.removeTag("name='description'");
    this.metaService.updateTag({ name: 'description', content: description });

    // Open Graph y Twitter
    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image || '' },
      { property: 'og:url', content: fullUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image || '' },
    ];
    metaTags.forEach((tag:any) => this.metaService.updateTag(tag));

    // Canonical
    this.setCanonicalUrl(fullUrl);
  }

    private setCanonicalUrl(url: string): void {
        let link = document.querySelector("link[rel='canonical']");
        if (link) {
            link.setAttribute('href', url);
        } else {
            const newLink: HTMLLinkElement = document.createElement('link');
            newLink.setAttribute('rel', 'canonical');
            newLink.setAttribute('href', url);
            document.head.appendChild(newLink);
        }
    }
  
}
