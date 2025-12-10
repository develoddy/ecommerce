import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { URL_FRONTEND } from 'src/app/config/config';

export interface SeoData {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'product' | 'category' | 'homepage' | 'prelaunch';
  product?: {
    name: string;
    price?: number;
    currency?: string;
    category?: string;
    brand?: string;
    availability?: string;
    condition?: string;
  };
  prelaunch?: {
    launchDate: string;
    subscriberCount?: number;
    benefits?: string[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly devKeywords = [
    'developer merch', 'programmer shirts', 'coding t-shirts', 'funny programming',
    'developer gifts', 'programmer hoodies', 'coding apparel', 'software engineer',
    'programming humor', 'developer swag', 'coding jokes', 'programmer gifts'
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {}

  /**
   * Actualiza el SEO de la página con optimizaciones avanzadas
   */
  updateSeo(data: SeoData): void {
    const domain = URL_FRONTEND.replace(/\/$/, '');
    const cleanPath = this.router.url.split('?')[0];
    const fullUrl = data.url || `${domain}${cleanPath}`;

    // Optimizar título según tipo
    const optimizedTitle = this.optimizeTitle(data);
    this.titleService.setTitle(optimizedTitle);

    // Meta description optimizada
    const optimizedDescription = this.optimizeDescription(data);
    this.metaService.updateTag({ name: 'description', content: optimizedDescription });

    // Keywords
    if (data.keywords && data.keywords.length > 0) {
      const allKeywords = [...data.keywords, ...this.devKeywords].slice(0, 15);
      this.metaService.updateTag({ name: 'keywords', content: allKeywords.join(', ') });
    }

    // Open Graph y Twitter
    const metaTags = [
      { property: 'og:title', content: optimizedTitle },
      { property: 'og:description', content: optimizedDescription },
      { property: 'og:image', content: data.image || '' },
      { property: 'og:url', content: fullUrl },
      { property: 'og:type', content: data.type === 'product' ? 'product' : 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: optimizedTitle },
      { name: 'twitter:description', content: optimizedDescription },
      { name: 'twitter:image', content: data.image || '' },
    ];
    metaTags.forEach((tag:any) => this.metaService.updateTag(tag));

    // JSON-LD Schema
    this.addStructuredData(data, fullUrl);

    // Canonical = URL real
    this.setCanonicalUrl(fullUrl);

    // Hreflangs dinámicos
    this.setDynamicHreflangs();
  }

  /**
   * Optimiza el título según el tipo de página
   */
  private optimizeTitle(data: SeoData): string {
    switch (data.type) {
      case 'product':
        return `${data.title} | Premium Developer Merch | LujanDev Store`;
      case 'category':
        return `${data.title} | Developer T-Shirts & Programming Merch | LujanDev`;
      case 'prelaunch':
        return `${data.title} | Coming Soon | LujanDev Developer Store`;
      case 'homepage':
        return `${data.title} | LujanDev - Premium Developer Merchandise`;
      default:
        return `${data.title} | LujanDev Developer Store`;
    }
  }

  /**
   * Optimiza la descripción con keywords naturales
   */
  private optimizeDescription(data: SeoData): string {
    const baseDescription = data.description;
    
    switch (data.type) {
      case 'product':
        return `${baseDescription} Perfect for developers, programmers, and coding enthusiasts. Premium quality developer merchandise.`;
      case 'prelaunch':
        return `${baseDescription} Exclusive developer merch launching soon with special early-bird pricing.`;
      default:
        return baseDescription;
    }
  }

  /**
   * Agrega datos estructurados JSON-LD
   */
  private addStructuredData(data: SeoData, url: string): void {
    // Remover scripts previos
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    // Schema del sitio web
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "LujanDev Developer Store",
      "url": URL_FRONTEND,
      "description": "Premium developer merchandise, programmer t-shirts, and coding apparel for software engineers."
    };

    // Schema específico según tipo
    if (data.type === 'product' && data.product) {
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": data.product.name,
        "description": data.description,
        "brand": {
          "@type": "Brand",
          "name": data.product.brand || "LujanDev"
        },
        "category": data.product.category || "Developer Merchandise",
        "url": url,
        "image": data.image || `${URL_FRONTEND}/assets/img/default-product.jpg`
      };

      if (data.product.price) {
        (productSchema as any).offers = {
          "@type": "Offer",
          "price": data.product.price,
          "priceCurrency": data.product.currency || "USD",
          "availability": `https://schema.org/${data.product.availability || 'InStock'}`
        };
      }

      this.insertJsonLdScript(productSchema);
    }

    this.insertJsonLdScript(websiteSchema);
  }

  /**
   * Inserta script JSON-LD en el head de forma optimizada
   */
  private insertJsonLdScript(schema: any): void {
    // Evitar duplicados
    const existingScript = document.querySelector(`script[type="application/ld+json"][data-schema-type="${schema['@type']}"]`);
    if (existingScript) {
      existingScript.textContent = JSON.stringify(schema);
      return;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', schema['@type']);
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  private setCanonicalUrl(url: string): void {
      let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (link) {
          link.href = url;
      } else {
          const newLink: HTMLLinkElement = document.createElement('link');
          newLink.rel = 'canonical';
          newLink.href = url;
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
