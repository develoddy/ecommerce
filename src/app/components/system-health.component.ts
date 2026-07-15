import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';
import { CookieConsentService } from '../services/cookie-consent.service';
import { SentryService } from '../services/sentry.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface SystemStatus {
  analytics: {
    ga4: boolean;
    metaPixel: boolean;
    consent: string;
  };
  api: {
    backend: boolean;
    printful: boolean;
    stripe: boolean;
  };
  features: {
    products: boolean;
    cart: boolean;
    checkout: boolean;
  };
}

@Component({
  selector: 'app-system-health',
  template: `
    <div class="system-health-panel" *ngIf="showPanel && isDevelopment">
      <div class="card shadow-sm">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h6 class="mb-0">🏥 System Health Dashboard</h6>
          <button class="btn btn-sm btn-outline-light" (click)="togglePanel()">×</button>
        </div>
        <div class="card-body p-3">
          
          <!-- Analytics Status -->
          <div class="mb-3">
            <h6>📊 Analytics</h6>
            <div class="row">
              <div class="col-4">
                <span class="badge" [class]="systemStatus.analytics.ga4 ? 'bg-success' : 'bg-danger'">
                  GA4: {{ systemStatus.analytics.ga4 ? 'OK' : 'FAIL' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge" [class]="systemStatus.analytics.metaPixel ? 'bg-success' : 'bg-danger'">
                  Meta: {{ systemStatus.analytics.metaPixel ? 'OK' : 'FAIL' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge bg-info">{{ systemStatus.analytics.consent }}</span>
              </div>
            </div>
          </div>

          <!-- API Status -->
          <div class="mb-3">
            <h6>🔌 API Status</h6>
            <div class="row">
              <div class="col-4">
                <span class="badge" [class]="systemStatus.api.backend ? 'bg-success' : 'bg-danger'">
                  Backend: {{ systemStatus.api.backend ? 'OK' : 'FAIL' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge" [class]="systemStatus.api.printful ? 'bg-success' : 'bg-warning'">
                  Printful: {{ systemStatus.api.printful ? 'OK' : 'UNKNOWN' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge" [class]="systemStatus.api.stripe ? 'bg-success' : 'bg-warning'">
                  Stripe: {{ systemStatus.api.stripe ? 'OK' : 'UNKNOWN' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Features Status -->
          <div class="mb-3">
            <h6>🛍️ E-commerce Features</h6>
            <div class="row">
              <div class="col-4">
                <span class="badge" [class]="systemStatus.features.products ? 'bg-success' : 'bg-danger'">
                  Products: {{ systemStatus.features.products ? 'OK' : 'FAIL' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge" [class]="systemStatus.features.cart ? 'bg-success' : 'bg-warning'">
                  Cart: {{ systemStatus.features.cart ? 'OK' : 'UNTESTED' }}
                </span>
              </div>
              <div class="col-4">
                <span class="badge" [class]="systemStatus.features.checkout ? 'bg-success' : 'bg-warning'">
                  Checkout: {{ systemStatus.features.checkout ? 'OK' : 'UNTESTED' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" (click)="runHealthCheck()">
              🔄 Refresh
            </button>
            <button class="btn btn-sm btn-outline-success" (click)="runAnalyticsTest()">
              📊 Test Analytics
            </button>
            <button class="btn btn-sm btn-outline-info" (click)="showDebugInfo()">
              🔍 Debug
            </button>
            <button class="btn btn-sm btn-outline-warning" (click)="simulatePurchase()">
              🛒 Test Purchase Event
            </button>
            <button class="btn btn-sm btn-outline-danger" (click)="testSentry()">
              🚨 Test Sentry Frontend
            </button>
            <button class="btn btn-sm btn-outline-danger" (click)="testSentryBackend()">
              🚨 Test Sentry Backend
            </button>
          </div>

          <!-- Environment Info -->
          <div class="mt-3 pt-2 border-top">
            <small class="text-muted">
              Environment: {{ environment.production ? 'PRODUCTION' : 'DEVELOPMENT' }} | 
              Last check: {{ lastCheck | date:'HH:mm:ss' }}
            </small>
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle Button -->
    <button *ngIf="!showPanel && isDevelopment" 
            class="btn btn-primary btn-sm position-fixed bottom-0 start-0 m-3" 
            (click)="togglePanel()"
            style="z-index: 1000;">
      🏥 Health
    </button>
  `,
  styles: [`
    .system-health-panel {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 800px;
      z-index: 1050;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    @media (max-width: 768px) {
      .system-health-panel {
        width: calc(100vw - 40px);
        left: 20px;
        right: 20px;
      }
    }
    
    .badge {
      font-size: 0.7em;
    }
  `]
})
export class SystemHealthComponent implements OnInit {

  showPanel = false;
  isDevelopment = !environment.production;
  environment = environment; // Make environment available in template
  lastCheck = new Date();

  systemStatus: SystemStatus = {
    analytics: {
      ga4: false,
      metaPixel: false,
      consent: 'unknown'
    },
    api: {
      backend: false,
      printful: false,
      stripe: false
    },
    features: {
      products: false,
      cart: false,
      checkout: false
    }
  };

  constructor(
    private analyticsService: AnalyticsService,
    private cookieConsentService: CookieConsentService,
    private sentryService: SentryService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Solo mostrar en desarrollo
    if (this.isDevelopment) {
      // Ejecutar health check inicial después de 3 segundos
      setTimeout(() => {
        this.runHealthCheck();
      }, 3000);
    }
  }

  togglePanel() {
    this.showPanel = !this.showPanel;
    if (this.showPanel) {
      this.runHealthCheck();
    }
  }

  async runHealthCheck() {
    console.log('🏥 Running system health check...');
    this.lastCheck = new Date();

    // Check Analytics
    await this.checkAnalytics();
    
    // Check API endpoints
    await this.checkAPIEndpoints();
    
    // Check Features
    await this.checkFeatures();

    console.log('🏥 Health check completed:', this.systemStatus);
  }

  private async checkAnalytics() {
    try {
      const analyticsHealth = await this.analyticsService.healthCheck();
      const analyticsStatus = this.analyticsService.getAnalyticsStatus();
      
      this.systemStatus.analytics = {
        ga4: analyticsHealth.ga4,
        metaPixel: analyticsHealth.metaPixel,
        consent: analyticsStatus.consentStatus || 'none'
      };
    } catch (error) {
      console.error('❌ Error checking analytics:', error);
      this.systemStatus.analytics = {
        ga4: false,
        metaPixel: false,
        consent: 'error'
      };
    }
  }

  private async checkAPIEndpoints() {
    // Check Backend API
    try {
      const backendResponse = await this.http.get(`${environment.URL_BACKEND}health`)
        .pipe(
          timeout(5000),
          catchError(err => {
            console.error('❌ Backend API check failed:', err);
            return of(null);
          })
        ).toPromise();
      this.systemStatus.api.backend = !!backendResponse;
    } catch (error) {
      console.error('❌ Backend API check failed:', error);
      this.systemStatus.api.backend = false;
    }

    // Check if we can reach products endpoint
    try {
      const productsResponse = await this.http.get(`${environment.URL_SERVICE}home/list`)
        .pipe(
          timeout(5000),
          catchError(err => {
            console.error('❌ Products API check failed:', err);
            return of(null);
          })
        ).toPromise();
      this.systemStatus.features.products = !!productsResponse;
    } catch (error) {
      console.error('❌ Products API check failed:', error);
      this.systemStatus.features.products = false;
    }

    // Check Printful integration
    try {
      const printfulResponse = await this.http.get(`${environment.URL_SERVICE}printful/test`)
        .pipe(
          timeout(5000),
          catchError(err => {
            console.warn('⚠️ Printful test endpoint not available:', err);
            return of(null);
          })
        ).toPromise();
      this.systemStatus.api.printful = !!printfulResponse;
    } catch (error) {
      console.warn('⚠️ Printful check failed:', error);
      this.systemStatus.api.printful = false;
    }

    // Check Stripe integration  
    try {
      const stripeResponse = await this.http.get(`${environment.URL_SERVICE}stripe/test`)
        .pipe(
          timeout(5000),
          catchError(err => {
            console.warn('⚠️ Stripe test endpoint not available:', err);
            return of(null);
          })
        ).toPromise();
      this.systemStatus.api.stripe = !!stripeResponse;
    } catch (error) {
      console.warn('⚠️ Stripe check failed:', error);
      this.systemStatus.api.stripe = false;
    }
  }

  private async checkFeatures() {
    // Check if cart service is available
    try {
      const cartData = localStorage.getItem('cart');
      this.systemStatus.features.cart = true; // Cart storage available
    } catch (error) {
      this.systemStatus.features.cart = false;
    }

    // Check checkout (basic verification)
    this.systemStatus.features.checkout = this.systemStatus.api.backend;
  }

  runAnalyticsTest() {
    console.log('📊 Running analytics test...');
    
    // Test GA4 event
    this.analyticsService.trackEvent('system_health_test', {
      event_category: 'testing',
      event_label: 'manual_health_check',
      custom_parameters: {
        timestamp: new Date().toISOString(),
        test_id: Math.random().toString(36).substr(2, 9)
      }
    });

    // Test Meta Pixel event
    this.analyticsService.trackCustomEvent('SystemHealthTest', {
      source: 'health_dashboard',
      manual_trigger: true,
      timestamp: new Date().toISOString()
    });

    alert('📊 Analytics test events sent! Check console for logs.');
  }

  showDebugInfo() {
    console.group('🔍 System Debug Information');
    console.log('📊 Analytics Status:', this.analyticsService.getAnalyticsStatus());
    console.log('🍪 Cookie Preferences:', this.cookieConsentService.getPreferences());
    console.log('🏥 System Status:', this.systemStatus);
    console.log('🌐 Environment:', environment);
    console.log('📅 User Agent:', navigator.userAgent);
    console.log('🌍 Location:', window.location.href);
    console.groupEnd();
    
    this.analyticsService.debugInfo();
    
    alert('🔍 Debug information logged to console!');
  }

  simulatePurchase() {
    console.log('🛒 Simulating purchase event for testing...');
    
    const testOrderId = 'TEST_' + Math.random().toString(36).substr(2, 9);
    const testValue = 29.99;
    
    const testItems = [{
      item_id: 'TEST_PROD_001',
      item_name: 'Test Product - Health Check',
      category: 'Testing',
      quantity: 1,
      price: testValue
    }];

    // Track test purchase
    this.analyticsService.trackPurchase(testOrderId, testValue, 'EUR', testItems);
    
    console.log('🎉 Test purchase event sent:', { 
      orderId: testOrderId, 
      value: testValue, 
      items: testItems 
    });
    
    alert(`🛒 Test purchase event sent!\nOrder ID: ${testOrderId}\nValue: €${testValue}`);
  }

  /**
   * 🚨 Test Sentry integration
   */
  testSentry(): void {
    console.log('🚨 Testing Sentry integration...');
    
    // Test Sentry service
    this.sentryService.testSentry();
    
    // Track test event
    this.sentryService.trackEcommerceEvent('sentry_test_triggered', {
      source: 'health_dashboard',
      timestamp: new Date().toISOString(),
      environment: environment.production ? 'production' : 'development'
    });
    
    alert('🚨 Sentry Frontend test executed!\nCheck browser console and Sentry dashboard for results.');
  }

  /**
   * 🚨 Test Sentry Backend integration
   */
  async testSentryBackend(): Promise<void> {
    console.log('🚨 Testing Sentry Backend integration...');
    
    try {
      const response = await this.http.get(`${environment.URL_BACKEND}sentry-test`)
        .pipe(
          timeout(10000),
          catchError(err => {
            console.error('❌ Sentry Backend test failed:', err);
            return of(null);
          })
        ).toPromise();
      
      if (response) {
        console.log('✅ Sentry Backend test response:', response);
        alert('🚨 Sentry Backend test executed!\nCheck backend logs and Sentry dashboard for results.');
      } else {
        alert('❌ Sentry Backend test failed!\nCheck backend status and try again.');
      }
      
    } catch (error) {
      console.error('❌ Error testing Sentry Backend:', error);
      alert('❌ Error testing Sentry Backend!\nSee console for details.');
    }
  }
}

// NOTA: Este componente debe ser añadido al app.component.html
// <app-system-health></app-system-health>