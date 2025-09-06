import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { URL_FRONTEND } from 'src/app/config/config';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {}

  /**
   * Actualiza el SEO de la página
   * @param data title, description, image opcional y slug opcional
   */
  updateSeo(data: { title: string; description: string; image?: string }) {
    const { title, description, image } = data;

    // ✅ Agregar debug para ver qué llega
    console.log('--- SEO Service updateSeo() ---');
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Image:', image);
    console.log('Current URL:', this.router.url);

    const domain = URL_FRONTEND.replace(/\/$/, ''); 

    // ✅ Siempre usa la ruta real del navegador (sin query params)
    const cleanPath = this.router.url.split('?')[0]; 
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

    // Canonical = URL real
    this.setCanonicalUrl(fullUrl);

    // Hreflangs dinámicos
    this.setDynamicHreflangs();
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

  /**
   * Genera hreflangs dinámicos según country/lang de la tienda
   */
  private setDynamicHreflangs() {
    // Eliminar hreflangs previos
    document.head.querySelectorAll('link[rel="alternate"]').forEach(el => el.remove());

    const baseUrl = URL_FRONTEND.replace(/\/$/, '');
    const pathSegments = this.router.url.split('?')[0].split('/');

    // Extraer la ruta limpia (después de /country/lang)
    const restPath = pathSegments.slice(3).join('/');

    // Map de idiomas → country correspondiente
    const hreflangMap = {
      es: 'es', // España
      en: 'us', // EE.UU.
    };

    Object.entries(hreflangMap).forEach(([lang, country]) => {
      const link: HTMLLinkElement = document.createElement('link');
      link.rel = 'alternate';
      link.href = `${baseUrl}/${country}/${lang}/${restPath}`;
      link.hreflang = lang;
      document.head.appendChild(link);
    });

    // x-default → versión principal en inglés
    const defaultLink: HTMLLinkElement = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.href = `${baseUrl}/es/es/${restPath}`;
    defaultLink.hreflang = 'x-default';
    document.head.appendChild(defaultLink);
  }

}
