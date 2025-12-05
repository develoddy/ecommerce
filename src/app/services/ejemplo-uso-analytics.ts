// 🎯 EJEMPLO DE USO: AnalyticsService en componentes E-commerce
// Archivo: ejemplo-uso-analytics.ts (SOLO PARA REFERENCIA)

import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';

@Component({
  selector: 'app-product-detail',
  template: `<div>Producto: {{ producto.name }}</div>`
})
export class ProductDetailExampleComponent implements OnInit {

  producto = {
    id: 'PROD_001',
    name: 'Camiseta Developer Supreme',
    category: 'Camisetas',
    price: 29.99
  };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    // 👁️ TRACKING DE VISTA DE PRODUCTO (automático al cargar)
    this.analyticsService.trackProductView(
      this.producto.id,
      this.producto.name, 
      this.producto.category,
      this.producto.price
    );
  }

  onAddToCart() {
    // 🛒 TRACKING DE AÑADIR AL CARRITO
    this.analyticsService.trackAddToCart(
      this.producto.id,
      this.producto.name,
      this.producto.category,
      this.producto.price,
      1 // cantidad
    );
    
    // Tu lógica de añadir al carrito aquí...
    console.log('Producto añadido al carrito');
  }

  onShare() {
    // 📤 TRACKING DE COMPARTIR PRODUCTO
    this.analyticsService.trackEvent('share', {
      event_category: 'social',
      event_label: this.producto.name,
      custom_parameters: {
        item_id: this.producto.id,
        share_method: 'copy_link'
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-checkout',
  template: `<div>Checkout Process</div>`
})
export class CheckoutExampleComponent {

  cartItems = [
    { item_id: 'PROD_001', item_name: 'Camiseta Dev', item_category: 'Camisetas', quantity: 2, price: 29.99 },
    { item_id: 'PROD_002', item_name: 'Hoodie Code', item_category: 'Hoodies', quantity: 1, price: 49.99 }
  ];

  constructor(private analyticsService: AnalyticsService) {}

  onInitiateCheckout() {
    const totalValue = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 🛒 TRACKING DE INICIO DE CHECKOUT
    this.analyticsService.trackBeginCheckout(totalValue, this.cartItems);
  }

  onCompletePurchase(orderId: string) {
    const totalValue = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 🎉 TRACKING DE COMPRA COMPLETADA
    this.analyticsService.trackPurchase(orderId, totalValue, 'EUR', this.cartItems);
    
    // También puedes trackear eventos personalizados
    this.analyticsService.trackCustomEvent('FirstTimeCustomer', {
      order_value: totalValue,
      payment_method: 'stripe',
      customer_type: 'new'
    });
  }
}

// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-search',
  template: `<input (keyup.enter)="onSearch($event)">`
})
export class SearchExampleComponent {

  constructor(private analyticsService: AnalyticsService) {}

  onSearch(event: any) {
    const searchTerm = event.target.value;
    
    // 🔍 TRACKING DE BÚSQUEDA
    // Simular que encontramos 12 resultados
    const resultsCount = 12;
    
    this.analyticsService.trackSearch(searchTerm, resultsCount);
  }
}

// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-newsletter',
  template: `<button (click)="onNewsletterSignup()">Suscribirse</button>`
})
export class NewsletterExampleComponent {

  constructor(private analyticsService: AnalyticsService) {}

  onNewsletterSignup() {
    // 📧 TRACKING DE SUSCRIPCIÓN A NEWSLETTER
    this.analyticsService.trackNewsletterSignup();
    
    // Evento personalizado adicional
    this.analyticsService.trackEvent('newsletter_conversion', {
      event_category: 'lead_generation',
      event_label: 'footer_signup',
      value: 1
    });
  }
}

// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-contact',
  template: `<button (click)="onStartChat()">Iniciar Chat</button>`
})
export class ContactExampleComponent {

  constructor(private analyticsService: AnalyticsService) {}

  onStartChat() {
    // 💬 TRACKING DE INICIO DE CHAT
    this.analyticsService.trackContactInitiated();
    
    // Evento personalizado para medir efectividad del chat
    this.analyticsService.trackCustomEvent('ChatWidgetUsed', {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      user_type: 'anonymous' // o 'logged_in'
    });
  }
}

// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-debug-panel',
  template: `
    <div *ngIf="isDevelopment">
      <h3>Analytics Debug Panel</h3>
      <button (click)="showDebugInfo()">Show Debug Info</button>
      <button (click)="checkHealth()">Health Check</button>
      <button (click)="testEvent()">Test Event</button>
      <div>{{ debugStatus | json }}</div>
    </div>
  `
})
export class DebugAnalyticsComponent {
  
  isDevelopment = !environment.production; // Importar environment
  debugStatus: any = {};

  constructor(private analyticsService: AnalyticsService) {}

  showDebugInfo() {
    // 🔍 MOSTRAR INFORMACIÓN DE DEBUG
    this.analyticsService.debugInfo();
    this.debugStatus = this.analyticsService.getAnalyticsStatus();
  }

  async checkHealth() {
    // 🏥 VERIFICAR SALUD DE ANALYTICS
    const health = await this.analyticsService.healthCheck();
    console.log('🏥 Analytics Health Check:', health);
    this.debugStatus = { ...this.debugStatus, health };
  }

  testEvent() {
    // 🧪 EVENTO DE PRUEBA
    this.analyticsService.trackEvent('debug_test', {
      event_category: 'testing',
      event_label: 'manual_test',
      custom_parameters: {
        test_timestamp: new Date().toISOString(),
        test_id: Math.random().toString(36).substr(2, 9)
      }
    });

    this.analyticsService.trackCustomEvent('DebugTest', {
      source: 'debug_panel',
      manual_trigger: true
    });

    console.log('🧪 Test events sent successfully');
  }
}

/* 
═══════════════════════════════════════════════════════════════
📋 CHECKLIST DE IMPLEMENTACIÓN:

✅ 1. Reemplazar IDs placeholder en analytics.service.ts:
   - GA4_MEASUREMENT_ID: 'G-TU_ID_REAL'
   - META_PIXEL_ID: 'TU_PIXEL_ID_REAL'

✅ 2. Importar AnalyticsService en tus componentes:
   constructor(private analyticsService: AnalyticsService) {}

✅ 3. Añadir tracking en eventos clave:
   - Vista de producto: trackProductView()
   - Añadir carrito: trackAddToCart()  
   - Inicio checkout: trackBeginCheckout()
   - Compra completada: trackPurchase()
   - Búsquedas: trackSearch()
   - Newsletter: trackNewsletterSignup()
   - Contacto: trackContactInitiated()

✅ 4. Eventos personalizados según tu negocio:
   - trackEvent() para GA4
   - trackCustomEvent() para Meta Pixel

✅ 5. Testing y debug:
   - debugInfo() para información completa
   - healthCheck() para verificar funcionamiento
   - getAnalyticsStatus() para estado actual

═══════════════════════════════════════════════════════════════
*/