/**
 * Plantillas SEO para diferentes tipos de páginas
 * Ejemplos de implementación con keywords optimizados para developer merch
 */

export const SEO_TEMPLATES = {
  
  // Ejemplo para página de producto
  productSeoExample: {
    title: 'Funny Programming T-Shirt: "There are only 10 types of people"',
    description: 'Hilarious programming t-shirt perfect for developers and coders. Premium quality cotton with binary joke design.',
    keywords: [
      'funny programming t-shirt',
      'developer humor shirt',
      'coding joke apparel',
      'programmer gift',
      'binary shirt',
      'developer merch'
    ],
    image: '/assets/img/products/binary-shirt.jpg',
    type: 'product' as const,
    product: {
      name: 'Binary Programming T-Shirt',
      price: 29.99,
      currency: 'USD',
      category: 'Programming Humor',
      brand: 'LujanDev',
      availability: 'InStock',
      condition: 'NewCondition'
    }
  },

  // Ejemplo para página de categoría
  categorySeoExample: {
    title: 'Programming Humor T-Shirts',
    description: 'Collection of funny programming and coding t-shirts. Perfect gifts for developers, software engineers, and coding enthusiasts.',
    keywords: [
      'programming humor shirts',
      'funny coding t-shirts',
      'developer joke apparel',
      'programmer humor collection',
      'coding meme shirts',
      'developer gift ideas'
    ],
    image: '/assets/img/categories/programming-humor.jpg',
    type: 'category' as const
  },

  // Ejemplo para homepage
  homepageSeoExample: {
    title: 'Developer Merch & Funny Programming T-Shirts',
    description: 'Premium developer merchandise store featuring funny programming t-shirts, coding hoodies, and developer gifts for software engineers.',
    keywords: [
      'developer merch',
      'programmer shirts',
      'coding t-shirts',
      'funny programming',
      'developer gifts',
      'programmer hoodies',
      'coding apparel',
      'software engineer merch'
    ],
    image: '/assets/img/homepage-hero.jpg',
    type: 'homepage' as const
  },

  // Ejemplo para página de pre-lanzamiento
  prelaunchSeoExample: {
    title: 'Coming Soon: Premium Developer Merch Collection',
    description: 'Exclusive developer merchandise launching soon! Early access to premium programmer t-shirts, coding hoodies, and funny programming gifts.',
    keywords: [
      'developer merch coming soon',
      'programmer t-shirts pre-launch',
      'coding merchandise exclusive',
      'programming gifts early access',
      'developer store launch'
    ],
    image: '/assets/img/pre-launch-hero.jpg',
    type: 'prelaunch' as const,
    prelaunch: {
      launchDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscriberCount: 1250,
      benefits: [
        'Early access to exclusive designs',
        '20% off launch discount',
        'Limited edition programmer shirts',
        'Free shipping on first order'
      ]
    }
  }
};

/**
 * Generadores de contenido SEO
 */
export const SEO_GENERATORS = {
  
  /**
   * Genera título optimizado para productos
   */
  generateProductTitle: (productName: string, category: string) => {
    const categoryKeywords: { [key: string]: string } = {
      'humor': 'Funny Programming',
      'frontend': 'Frontend Developer',
      'backend': 'Backend Developer',
      'fullstack': 'Full Stack Developer',
      'javascript': 'JavaScript Developer',
      'python': 'Python Programmer',
      'react': 'React Developer'
    };
    
    const keywordSuffix = categoryKeywords[category?.toLowerCase()] || 'Developer';
    return `${productName} | ${keywordSuffix} T-Shirt | Premium Coding Apparel`;
  },

  /**
   * Genera descripción optimizada para productos
   */
  generateProductDescription: (productName: string, baseDescription: string, isHumorous: boolean = false) => {
    const humorSuffix = isHumorous 
      ? ' Perfect for developers with a sense of humor and coding enthusiasts who love programming jokes.'
      : ' Ideal for software engineers, programmers, and coding professionals.';
    
    return `${baseDescription}${humorSuffix} Premium quality developer merchandise designed by programmers for programmers.`;
  },

  /**
   * Genera keywords específicos para productos
   */
  generateProductKeywords: (productName: string, category: string, tags: string[] = []) => {
    const baseKeywords = [
      'developer merch',
      'programmer shirt',
      'coding t-shirt',
      'developer gift',
      'programming apparel'
    ];

    const categoryKeywords: { [key: string]: string[] } = {
      'humor': ['funny programming', 'coding jokes', 'developer humor', 'programming memes'],
      'javascript': ['javascript shirt', 'js developer', 'node.js apparel'],
      'python': ['python programmer', 'python developer', 'snake code shirt'],
      'react': ['react developer', 'react.js shirt', 'frontend developer'],
      'backend': ['backend developer', 'server side', 'api developer'],
      'fullstack': ['full stack developer', 'fullstack engineer', 'complete developer']
    };

    return [
      ...baseKeywords,
      ...(categoryKeywords[category?.toLowerCase()] || []),
      ...tags,
      `${productName.toLowerCase()} shirt`,
      'developer clothing',
      'programming merchandise'
    ].slice(0, 15);
  }
};

/**
 * Helpers para optimización de contenido
 */
export const SEO_HELPERS = {
  
  /**
   * Optimiza meta descriptions agregando call-to-actions
   */
  addCallToAction: (description: string, type: 'product' | 'category' | 'homepage' = 'product') => {
    const ctas = {
      product: ' Order now with free shipping!',
      category: ' Shop the collection today!',
      homepage: ' Discover your perfect developer style!'
    };
    
    return `${description}${ctas[type]}`;
  },

  /**
   * Genera structured data para productos
   */
  generateProductStructuredData: (product: any, url: string) => {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.image,
      "brand": {
        "@type": "Brand",
        "name": "LujanDev"
      },
      "category": "Developer Merchandise",
      "url": url,
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };
  }
};