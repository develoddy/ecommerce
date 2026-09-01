import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  Output,
  HostListener,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { OnDestroy } from '@angular/core';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { CheckoutService } from '../../_services/checkoutService';
import { LocalizationService } from 'src/app/services/localization.service';
import { Location } from '@angular/common';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';
import { AnalyticsService } from 'src/app/services/analytics.service';

declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function actionNetxCheckout([]): any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;

@Component({
  selector: 'app-successfull-checkout',
  templateUrl: './successfull-checkout.component.html',
  styleUrls: ['./successfull-checkout.component.css'],
})
export class SuccessfullCheckoutComponent implements OnInit, OnDestroy {
  @ViewChild('paypal', { static: true }) paypalElement?: ElementRef;
  euro = '€';
  listAddressClients: any = [];
  listAddressGuest: any = [];
  // Address
  name: string = '';
  surname: string = '';
  pais: string = '';
  address: string = '';
  zipcode: string = '';
  poblacion: string = '';
  ciudad: string = '';
  email: string = '';
  phone: string = '';
  address_client_selected: any = null;
  shippingAddress: any = null;
  listCarts: any = [];
  totalCarts: any = null;
  show = false;
  user: any;
  code_cupon: any = null;
  sale: any;
  saleDetails: any = [];
  isSaleSuccess = false;
  CURRENT_USER_AUTHENTICATED: any = null;
  CURRENT_USER_GUEST: any = null;
  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd: boolean = false;
  public loading: boolean = false;
  private loadingStartTime: number | null = null;
  private minLoadingDuration: number = 4500; // Minimum 4.5 seconds for optimal payment UX
  isLastStepActive_1: boolean = false;
  isLastStepActive_2: boolean = false;
  isLastStepActive_3: boolean = false;
  isLastStepActive_4: boolean = false;
  errorAutenticate: boolean = false;
  errorMessageAutenticate: string = '';
  password_identify: string = '';
  email_identify: string = '';
  errorOrSuccessMessage: any = '';
  validMessage: boolean = false;
  status: boolean = false;
  private subscriptions: Subscription = new Subscription();
  @Output() activate = new EventEmitter<boolean>();
  isPasswordVisible: boolean = false;
  locale: string = '';
  country: string = '';
  saleData: any = null;

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  width: number = 100; // valor por defecto
  height: number = 100; // valor por defecto

  minDeliveryDate: string | null = null;
  maxDeliveryDate: string | null = null;
  
  // 🆕 Module purchase detection
  isModulePurchase: boolean = false;
  moduleType: string | null = null; // 'digital', 'service', 'physical'
  moduleName: string | null = null;

  constructor(
    public _authEcommerce: EcommerceAuthService,
    public _authService: AuthService,
    public _cartService: CartService,
    public _router: Router,
    private location: Location,
    private subscriptionService: SubscriptionService,
    public routerActived: ActivatedRoute,
    private checkoutService: CheckoutService,
    private localizationService: LocalizationService,
    private priceCalculationService: PriceCalculationService,
    private cdr: ChangeDetectorRef,
    private analyticsService: AnalyticsService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    const sessionId = this.routerActived.snapshot.queryParamMap.get('session_id');

    // 🔒 Detectar recarga manual: si ya visitó esta página, redirigir a /labs
    const hasVisitedSuccess = sessionStorage.getItem('visited_success_page');
    if (hasVisitedSuccess === 'true') {
      console.log('[Success] Recarga detectada - redirigiendo a /labs...');
      sessionStorage.removeItem('visited_success_page');
      sessionStorage.removeItem('checkout_sale_data');
      sessionStorage.removeItem('modulePurchase');
      this._router.navigate(['/labs']);
      return;
    }

    // Marcar que el usuario está visitando la página de éxito por primera vez
    sessionStorage.setItem('visited_success_page', 'true');

    // Suscribirse a cambios de localización
    this.subscribeToLocalization();

    if (sessionId) {
      this.fetchSaleWithRetry(sessionId, 20, 2000);
    } else {
      // 🔥 PayPal flow: Activar loading manualmente
      this.loading = true;
      this.loadingStartTime = Date.now();
      
      // 1) Try CheckoutService (synchronous)
      try {
        const svcData = this.checkoutService.getSaleData();
        if (svcData && (svcData.sale || svcData.saleDetails)) {
          //console.log('[Checkout Success] Loaded saleData from CheckoutService');
          this.saleData = svcData;
          this.sale = svcData.sale || svcData;
          this.saleDetails = svcData.saleDetails || svcData.saleDetails || [];
          this.minDeliveryDate = svcData?.deliveryEstimate?.min || null;
          this.maxDeliveryDate = svcData?.deliveryEstimate?.max || null;
          // Ensure CheckoutService is populated for other components
          try { this.checkoutService.setSaleData(this.saleData); this.checkoutService.setSaleSuccess(true); } catch(e){/* ignore */}
          
          // 🔥 Simular loading mínimo para mejor UX (igual que Stripe)
          setTimeout(() => {
            this.successPayStripe();
            
            // Desactivar loading después del tiempo mínimo
            const elapsed = Date.now() - (this.loadingStartTime || 0);
            const remainingTime = Math.max(0, this.minLoadingDuration - elapsed);
            setTimeout(() => {
              this.loading = false;
              this.loadingStartTime = null;
            }, remainingTime);
          }, 500); // Pequeño delay para mostrar el loading
          
          return;
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading CheckoutService saleData fallback', e);
        this.loading = false; // Desactivar loading en caso de error
      }

      // 2) Try navigation state (history.state or router extras)
      try {
        const nav = this._router.getCurrentNavigation?.();
        const navState = (nav && nav.extras && nav.extras.state) ? nav.extras.state : (history && history.state ? history.state : null);
        if (navState && (navState.sale || navState.saleDetails)) {
          this.saleData = navState;
          this.sale = navState.sale || navState;
          this.saleDetails = navState.saleDetails || [];
       
          this.minDeliveryDate = navState?.deliveryEstimate?.min || null;
          this.maxDeliveryDate = navState?.deliveryEstimate?.max || null;
          try { this.checkoutService.setSaleData(this.saleData); this.checkoutService.setSaleSuccess(true); } catch(e){/* ignore */}
          
          // 🔥 Aplicar loading mínimo
          setTimeout(() => {
            this.successPayStripe();
            
            const elapsed = Date.now() - (this.loadingStartTime || 0);
            const remainingTime = Math.max(0, this.minLoadingDuration - elapsed);
            setTimeout(() => {
              this.loading = false;
              this.loadingStartTime = null;
            }, remainingTime);
          }, 500);
          
          return;
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading navigation state fallback', e);
        this.loading = false;
      }

      // 3) Try sessionStorage as a last resort (if PayPal flow stored it there)
      try {
        const sess = sessionStorage.getItem('checkout_sale_data');
        if (sess) {
          const parsed = JSON.parse(sess);
          if (parsed && (parsed.sale || parsed.saleDetails)) {
        
            this.saleData = parsed;
            this.sale = parsed.sale || parsed;
            this.saleDetails = parsed.saleDetails || [];
           
            this.minDeliveryDate = parsed?.deliveryEstimate?.min || null;
            this.maxDeliveryDate = parsed?.deliveryEstimate?.max || null;
            try { this.checkoutService.setSaleData(this.saleData); this.checkoutService.setSaleSuccess(true); } catch(e){/* ignore */}
            
            // 🔥 Aplicar loading mínimo
            setTimeout(() => {
              this.successPayStripe();
              
              const elapsed = Date.now() - (this.loadingStartTime || 0);
              const remainingTime = Math.max(0, this.minLoadingDuration - elapsed);
              setTimeout(() => {
                this.loading = false;
                this.loadingStartTime = null;
              }, remainingTime);
            }, 500);
            
            return;
          }
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading sessionStorage fallback', e);
        this.loading = false;
      }
      
      // 🔥 Si no se encontró data en ningún fallback, desactivar loading
      this.loading = false;
    }

    // Limpiar parámetros de URL para evitar re-procesar en recarga
    if (sessionId) {
      const cleanPath = this._router.url.split('?')[0];
     
      this.location.replaceState(cleanPath);
    }

    this.activate.emit(true);
    this.subscriptionService.setShowSubscriptionSection(false);

    this._authEcommerce.loading$.subscribe((isLoading) => {
      if (isLoading) {
        // Record when loading starts
        this.loadingStartTime = Date.now();
        this.loading = true;
      } else {
        // Calculate elapsed time and ensure minimum duration
        if (this.loadingStartTime) {
          const elapsed = Date.now() - this.loadingStartTime;
          const remainingTime = Math.max(0, this.minLoadingDuration - elapsed);
          
          // Hide loading after remaining time to ensure minimum duration
          setTimeout(() => {
            this.loading = false;
            this.loadingStartTime = null;
          }, remainingTime);
        } else {
          // If no start time recorded, hide immediately (shouldn't happen normally)
          this.loading = false;
        }
      }
    });

    this.verifyAuthenticatedUser();
    this.checkIfAddressClientExists();
    this.checkDeviceType();

    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 150);
  }

  private fetchSaleWithRetry(sessionId: string, tries = 20, delay = 2000) {
    if (tries === 0) {
      // alertDanger('La venta aún no se ha registrado. Por favor, contacta soporte si el pago se completó.');
      return;
    }

    //console.log(`[Checkout Success] Attempting to fetch sale by session. Tries left: ${tries}`, sessionId);

    this._authEcommerce.getSaleBySession(sessionId).subscribe(
      (resp) => {
        if (resp?.sale) {
          
          this.saleData = resp.sale;
          this.saleDetails = resp.saleDetails || [];

          // Calcular total de la venta
          if (this.saleDetails.length > 0) {
            this.totalCarts = this.saleDetails.reduce(
              (sum: number, it: any) => {
                const itemPrice = Number(it.total || it.price_unitario || 0);
                const itemQuantity = Number(it.cantidad || 1);
                const itemSubtotal = itemPrice * itemQuantity;
                
                return sum + itemSubtotal;
              },
              0
            );
            this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
          
          } else {
            //console.warn('[Frontend] ⚠️ No saleDetails available for total calculation');
            this.totalCarts = resp.sale.total || 0; // Usar el total de la venta como fallback
          }

          // Actualizar checkoutService para que successPayStripe() funcione
          this.checkoutService.setSaleData({ sale: this.saleData, saleDetails: this.saleDetails });
          this.checkoutService.setSaleSuccess(true);
          
          this.successPayStripe();

          // GA4 purchase (aislado): solo aquí, con una venta real confirmada por Stripe
          this.trackPurchaseAnalytics(resp.sale, this.saleDetails);
        } else {
          // No hay venta aún, reintentar
          setTimeout(() => this.fetchSaleWithRetry(sessionId, tries - 1, delay), delay);
        }
      },
      (err) => {
        if (err.status === 404) {
          // Venta aún no registrada, reintentar
          setTimeout(() => this.fetchSaleWithRetry(sessionId, tries - 1, delay), delay);
        } else {
          console.error('[Checkout Success] Error fetching sale by session:', err);
        }
      }
    );
  }

  /**
   * Helper exclusivo de Analytics: dispara GA4 purchase una sola vez por sale.id (Stripe),
   * sin afectar ningún cálculo ni flujo existente de la compra.
   */
  private trackPurchaseAnalytics(sale: any, saleDetails: any[]): void {
    if (!sale?.id) {
      return;
    }

    const dedupeKey = `ga4_purchase_${sale.id}`;
    if (localStorage.getItem(dedupeKey)) {
      return;
    }

    const items = (saleDetails || []).map((detail: any) => ({
      item_id: detail.product?.id,
      item_name: detail.product?.title,
      item_category: detail.product?.category?.title,
      price: this.getFinalUnitPrice(detail),
      quantity: detail.cantidad
    }));

    const value = parseFloat(
      items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toFixed(2)
    );

    this.analyticsService.whenReady().then(() => {
      this.analyticsService.trackPurchase(String(sale.id), value, sale.currency_total || 'EUR', items);
      localStorage.setItem(dedupeKey, '1');
    });
  }

  successPayStripe() {
    //console.log('[Frontend] 🚀 successPayStripe() called');
    
    // 🆕 Limpiar sessionStorage de módulo para evitar conflictos en próximas compras
    sessionStorage.removeItem('modulePurchase');
    
    // Initial synchronous load from CheckoutService
    const initialData = this.checkoutService.getSaleData();
    //console.log('[Frontend] 📦 CheckoutService initialData:', initialData);
    
    if (initialData?.sale) {
      const saleInfo = initialData.sale;
      const saleDetails = initialData.saleDetails || [];
      
      // console.log('[Frontend] ✅ Processing initial data from CheckoutService:', {
      //   saleId: saleInfo.id,
      //   saleTotal: saleInfo.total,
      //   saleDetailsLength: saleDetails.length,
      //   firstDetail: saleDetails[0]
      // });
      
      this.sale = saleInfo;
      
      // 🆕 Detectar si es compra de módulo
      this.isModulePurchase = !!(saleInfo.module_id || initialData.isModulePurchase);
      
      if (this.isModulePurchase && saleDetails.length > 0) {
        const moduleDetail = saleDetails[0];
        // Cargar información completa del módulo desde backend
        if (moduleDetail.module_id || saleInfo.module_id) {
          const moduleId = moduleDetail.module_id || saleInfo.module_id;
          this.loadModuleInfo(moduleId);
        }
        console.log('🎯 [Successfull] Module purchase detected:', {
          moduleId: moduleDetail.module_id || saleInfo.module_id,
          type: this.moduleType
        });
      }
      
      // 🔥 FIX: Cargar dirección de envío desde sale_addresses (snake_case por Sequelize) si no está en shippingAddress (PayPal fallback)
      console.log('📦 [Successfull] Checking shipping address:', {
        hasShippingAddress: !!this.shippingAddress,
        hasSaleAddresses: !!(saleInfo.SaleAddresses || saleInfo.sale_addresses),
        saleAddressesLength: (saleInfo.SaleAddresses || saleInfo.sale_addresses)?.length,
        saleKeys: Object.keys(saleInfo)
      });
      
      if (!this.shippingAddress) {
        // Buscar en SaleAddresses (PascalCase) o sale_addresses (snake_case por Sequelize)
        const addresses = saleInfo.SaleAddresses || saleInfo.sale_addresses;
        if (addresses && addresses.length > 0) {
          const saleAddress = addresses[0];
          console.log('✅ [Successfull] Loading shipping address from sale_addresses:', saleAddress);
          this.shippingAddress = {
            name: saleAddress.name,
            surname: saleAddress.surname,
            address: saleAddress.address,
            zipcode: saleAddress.zipcode,
            poblacion: saleAddress.region || saleAddress.poblacion, // region es el campo correcto en la BD
            ciudad: saleAddress.ciudad,
            phone: saleAddress.telefono || saleAddress.phone, // telefono es el campo correcto
            email: saleAddress.email,
            pais: saleAddress.pais
          };
          // Force Angular to detect the change immediately
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ [Successfull] No sale_addresses available in sale object');
        }
      }
      
      // Calculate total immediately using final prices (with discounts)
      if (saleDetails.length > 0) {
        this.totalCarts = saleDetails.reduce((sum: number, item: any) => {
          const finalPrice = Number(
            item.total ?? item.price_unitario ?? item.discount ?? item.code_discount ?? item.variedade?.retail_price ?? 0
          );
          const quantity = Number(item.cantidad ?? 1);
          const itemSubtotal = finalPrice * quantity;
          
          // console.log('[Frontend] 🧮 successPayStripe item calc:', { 
          //   finalPrice, 
          //   quantity, 
          //   itemSubtotal,
          //   productTitle: item.product?.title,
          //   originalData: item
          // });
          
          return sum + itemSubtotal;
        }, 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      } else {
        this.totalCarts = saleInfo.total || 0;
        console.warn('[Frontend] ⚠️ No saleDetails, using sale.total as fallback:', this.totalCarts);
      }
      
      this.saleDetails = saleDetails;
      
      // console.log('[Frontend] 💰 Final totals in successPayStripe:', {
      //   totalCarts: this.totalCarts,
      //   saleDetailsLength: this.saleDetails.length,
      //   saleTotal: this.sale.total
      // });
    } else {
      console.warn('[Frontend] ⚠️ No initial data available from CheckoutService');
    }
    
    // Subscribe to updates (e.g., after Stripe)
    this.checkoutService.saleData$.subscribe((saleDataPayload) => {
      //console.log('[Frontend] 🔄 CheckoutService saleData$ update:', saleDataPayload);
      
      const saleInfo = saleDataPayload?.sale;
      const saleDetails = saleDataPayload?.saleDetails || [];
      if (saleInfo) {
        this.sale = saleInfo;
        
        // 🔥 También cargar dirección aquí en el subscriber
        if (!this.shippingAddress) {
          const addresses = saleInfo.SaleAddresses || saleInfo.sale_addresses;
          if (addresses && addresses.length > 0) {
            const saleAddress = addresses[0];
            console.log('✅ [Successfull-Subscriber] Loading shipping address from sale_addresses:', saleAddress);
            this.shippingAddress = {
              name: saleAddress.name,
              surname: saleAddress.surname,
              address: saleAddress.address,
              zipcode: saleAddress.zipcode,
              poblacion: saleAddress.region || saleAddress.poblacion,
              ciudad: saleAddress.ciudad,
              phone: saleAddress.telefono || saleAddress.phone,
              email: saleAddress.email,
              pais: saleAddress.pais
            };
            // Force Angular to detect the change immediately
            this.cdr.detectChanges();
          }
        }
        
        if (saleDetails.length > 0) {
          this.totalCarts = saleDetails.reduce((sum: number, item: any) => {
            const finalPrice = Number(
              item.total ?? item.price_unitario ?? item.discount ?? item.code_discount ?? item.variedade?.retail_price ?? 0
            );
            return sum + finalPrice * item.cantidad;
          }, 0);
          this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
        } else {
          this.totalCarts = saleInfo.total || 0;
        }
        
        this.saleDetails = saleDetails;
        
        // console.log('[Frontend] 🔄 Updated from subscription:', {
        //   totalCarts: this.totalCarts,
        //   saleDetailsLength: this.saleDetails.length
        // });
      }
    });
  }

  formatearFechaEntrega(fecha: string): { label: string; datetime: string } {
    const date = new Date(fecha);
    return {
      label: date
        .toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })
        .toLowerCase(),
      datetime: date.toISOString().split('T')[0],
    };
  }

  calculateTotal(cart: any[]): number {
    return cart.reduce((sum, item) => {
      const price = Number(
        item.variedade?.retail_price ??
          item.price_unitario ??
          item.product?.price_eur ??
          item.product?.price ??
          item.product?.price_usd ??
          0
      );
      return sum + price * item.cantidad;
    }, 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.subscribe((user) => {
      if (user) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.CURRENT_USER_GUEST = null;
        
        // 🆕 Para módulos digitales/servicios, usar email del usuario autenticado
        if (this.isModulePurchase && !this.requiresShipping()) {
          this.email = user.email;
          console.log('[Success] Using authenticated user email for module:', this.email);
        }
        
        this.checkIfAddressClientExists();
      } else {
        this._authEcommerce._authService.userGuest.subscribe((guestUser) => {
          if (guestUser?.guest) {
            this.CURRENT_USER_GUEST = guestUser;
            
            // 🆕 Para módulos digitales/servicios, recuperar email de sessionStorage
            if (this.isModulePurchase && !this.requiresShipping()) {
              const guestEmail = sessionStorage.getItem('moduleGuestEmail');
              const guestName = sessionStorage.getItem('moduleGuestName');
              if (guestEmail) {
                this.email = guestEmail;
                if (guestName) {
                  this.name = guestName;
                }
                console.log('[Success] Using guest email for module:', this.email);
              }
            }
            
            this.checkIfAddressGuestExists();
          } else {
            this.CURRENT_USER_GUEST = null;
          }
        });
      }
    });
  }

  checkIfAddressClientExists() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this._authEcommerce
        .listAddressClient(this.CURRENT_USER_AUTHENTICATED._id)
        .subscribe((resp: any) => {
          this.listAddressClients = resp.address_client;
          this.shippingAddress = this.listAddressClients[0];
        });
    }
  }

  checkIfAddressGuestExists() {
    if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listAddressGuest().subscribe((resp: any) => {
        this.listAddressGuest = resp.addresses;
        this.shippingAddress = this.listAddressGuest[0];
      });
    }
  }

  private subscribeToLocalization(): void {
    // Suscribirse a cambios de country y locale
    this.subscriptions.add(
      this.localizationService.country$.subscribe(country => {
        this.country = country;
      })
    );
    
    this.subscriptions.add(
      this.localizationService.locale$.subscribe(locale => {
        this.locale = locale;
      })
    );
  }

  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.country, this.locale, 'shop', 'home']);
  }

  /**
   * Navigate to public tracking page using orderId + trackingToken
   * ✅ Works for both guest and authenticated users
   * ✅ Consistent with email confirmation flow
   * ✅ No login required
   */
  navigateToTrackOrder() {
    if (!this.sale || !this.sale.id || !this.sale.trackingToken) {
      console.error('❌ Missing sale data for tracking navigation', {
        saleId: this.sale?.id,
        hasTrackingToken: !!this.sale?.trackingToken
      });
      
      // Fallback: redirect to tracking search page
      this._router.navigate(['/', this.country, this.locale, 'tracking']);
      return;
    }

    // Navigate to public tracking page with orderId + token
    // Same URL structure as email confirmation link
    this._router.navigate([
      '/', 
      this.country, 
      this.locale, 
      'tracking', 
      this.sale.id, 
      this.sale.trackingToken
    ]);
  }

  goToNextStep() {
    this.isLastStepActive_2 = true;
    this.isLastStepActive_3 = true;
    this.isLastStepActive_4 = false;
    this.isSaleSuccess = false;
  }

  onCheckboxChange(event: any) {
    this.isAddressSameAsShipping = event.target.checked;
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  getFormattedPrice(price: any) {
    const parsed = parseFloat(price);
    if (isNaN(parsed)) {
      return { integerPart: '0', decimalPart: '00' };
    }
    const [integerPart, decimalPart] = parsed.toFixed(2).split('.');
    return { integerPart, decimalPart };
  }

  getFormattedPriceOLD(price: any) {
    // 🔒 Protección contra null, undefined o cualquier valor "falsy"
    if (price === null || price === undefined) {
      return { integerPart: '0', decimalPart: '00' };
    }

    if (typeof price === 'string') {
      price = parseFloat(price); // Convertir a número
    }

    if (isNaN(price)) {
      return { integerPart: '0', decimalPart: '00' }; // Manejo de error si el valor no es válido
    }

    const formatted = price.toFixed(2).split('.'); // Asegura siempre dos decimales
    return {
      integerPart: formatted[0], // Parte entera
      decimalPart: formatted[1], // Parte decimal
    };
  }

  getImageUrl(sale: any): string {
    if (sale.variedade && Array.isArray(sale.variedade.files) && sale.variedade.files.length > 0) {
      // 1️⃣ Preview (aunque visible sea false)
      const previewFile = sale.variedade.files.find((f: any) => f.type === 'preview');
      if (previewFile && previewFile.preview_url) return previewFile.preview_url;

      // 2️⃣ Default
      const defaultFile = sale.variedade.files.find((f: any) => f.type === 'default');
      if (defaultFile && defaultFile.preview_url) return defaultFile.preview_url;

      // 3️⃣ Thumbnail como fallback
      const anyFile = sale.variedade.files[0];
      if (anyFile) return anyFile.preview_url || anyFile.thumbnail_url || anyFile.url || '';
    }

    // 4️⃣ Fallback al producto, o placeholder para módulos
    return sale.product?.imagen || sale.product?.portada || 'assets/images/logo.png';
  }

  removeAllCart(user_id: any) {
    this._cartService.deleteAllCart(user_id).subscribe(
      (resp: any) => {
        this._cartService.resetCart();
      },
      (error) => {
        console.error('Error al eliminar el carrito:', error);
      }
    );
  }

  removeCart(cart: any) {
    this._cartService.deleteCart(cart._id).subscribe((resp: any) => {
      this._cartService.removeItemCart(cart);
    });
  }

  apllyCupon() {
    let data = {
      code: this.code_cupon,
      user_id: this.CURRENT_USER_AUTHENTICATED._id,
    };
    this._cartService.apllyCupon(data).subscribe((resp: any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
      } else {
        alertSuccess(resp.message_text);
        this.listAllCarts();
      }
    });
  }

  listAllCarts() {
    this._cartService.resetCart();
    if (this._cartService._authService.user) {
      this._cartService
        .listCarts(this.CURRENT_USER_AUTHENTICATED._id)
        .subscribe((resp: any) => {
          resp.carts.forEach((cart: any) => {
            this._cartService.changeCart(cart);
          });
        });
    }
  }

  store() {
    this.address_client_selected
      ? this.updateAddress()
      : this.registerAddress();
  }

  private registerAddress() {
    if (
      !this.name ||
      !this.surname ||
      !this.pais ||
      !this.address ||
      !this.zipcode ||
      !this.poblacion ||
      !this.ciudad ||
      !this.email ||
      !this.phone
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage =
        'Rellene los campos obligatorios de la dirección de envío';
      this.hideMessageAfterDelay();
      alertDanger('Rellene los campos obligatorios de la dirección de envío');
      return;
    }

    let data = {
      user: this.CURRENT_USER_AUTHENTICATED._id,
      name: this.name,
      surname: this.surname,
      pais: this.pais,
      address: this.address,
      zipcode: this.zipcode,
      poblacion: this.poblacion,
      ciudad: this.ciudad,
      email: this.email,
      phone: this.phone,
    };

    this._authEcommerce.registerAddressClient(data).subscribe(
      (resp: any) => {
        if (resp.status == 200) {
          this.status = true;
          this.validMessage = true;
          this.errorOrSuccessMessage = resp.message;
          this.hideMessageAfterDelay();
          alertSuccess(resp.message);
          this.resetForm();
          $('#addNewModal').modal('hide');
        } else {
          this.status = false;
          this.errorOrSuccessMessage = 'Error al guardar la dirección';
          this.hideMessageAfterDelay();
        }
      },
      (error) => {
        this.status = false;
        this.errorOrSuccessMessage = 'Error al guardar la dirección';
        this.hideMessageAfterDelay();
      }
    );
  }

  private updateAddress() {
    if (
      !this.name ||
      !this.surname ||
      !this.pais ||
      !this.address ||
      !this.zipcode ||
      !this.poblacion ||
      !this.email ||
      !this.phone
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage =
        'Por favor, rellene los campos obligatorios de la dirección de envío';
      this.hideMessageAfterDelay();
      return;
    }

    // Preparar datos de dirección a actualizar
    let data = {
      _id: this.address_client_selected.id,
      user: this.CURRENT_USER_AUTHENTICATED._id,
      name: this.name,
      surname: this.surname,
      pais: this.pais,
      address: this.address,
      zipcode: this.zipcode,
      poblacion: this.poblacion,
      ciudad: this.ciudad,
      email: this.email,
      phone: this.phone,
      usual_shipping_address:
        this.address_client_selected.usual_shipping_address,
    };

    this._authEcommerce.updateAddressClient(data).subscribe(
      (resp: any) => {
        if (resp.status == 200) {
          let INDEX = this.listAddressClients.findIndex(
            (item: any) => item.id == this.address_client_selected.id
          );
          this.listAddressClients[INDEX] = resp.address_client;
          this.status = true;
          this.validMessage = true;
          this.errorOrSuccessMessage = resp.message;
          this.hideMessageAfterDelay();
          alertSuccess(resp.message);
          this.resetForm();
          $('#addEditModal').modal('hide');
        } else {
          this.status = false;
          this.errorOrSuccessMessage = 'Error al actualizar la dirección.';
          this.hideMessageAfterDelay();
        }
      },
      (error) => {
        this.status = false;
        this.errorOrSuccessMessage = 'Error al actualizar la dirección.';
        this.hideMessageAfterDelay();
      }
    );
  }

  private hideMessageAfterDelay() {
    setTimeout(() => {
      this.validMessage = false;
    }, 6000);
  }

  resetForm() {
    this.name = '';
    this.surname = '';
    this.pais = '';
    this.address = '';
    this.zipcode = '';
    this.poblacion = '';
    this.email = '';
    this.phone = '';
  }

  newAddress() {
    this.show = true;
    this.resetForm();
    this.address_client_selected = null;
  }

  addressClienteSelected(list_address: any) {
    this.show = true;
    this.address_client_selected = list_address;
    this.name = this.address_client_selected.name;
    this.surname = this.address_client_selected.surname;
    this.pais = this.address_client_selected.pais;
    this.address = this.address_client_selected.address;
    this.ciudad = this.address_client_selected.ciudad;
    this.phone = this.address_client_selected.telefono;
    this.email = this.address_client_selected.email;
    this.zipcode = this.address_client_selected.zipcode;
    this.poblacion = this.address_client_selected.poblacion;
    this.phone = this.address_client_selected.phone;
  }

  onAddressChange(event: any) {
    const selectedIndex = event.target.value;
    if (selectedIndex !== '') {
      const selectedAddress = this.listAddressClients[selectedIndex];
      this.addressClienteSelected(selectedAddress);
    }
  }

  removeAddressSelected(list_address: any) {
    this._authEcommerce
      .deleteAddressClient(list_address.id)
      .subscribe((resp: any) => {
        let INDEX = this.listAddressClients.findIndex(
          (item: any) => item.id == list_address.id
        );
        // Verifica si se encontró el elemento
        if (INDEX !== -1) {
          this.listAddressClients.splice(INDEX, 1); // Elimina 1 elemento a partir del índice INDEX
        }
        alertSuccess(resp.message);
        this.resetForm();
      });
  }

  verifyExistEmail(email: string) {
    sessionStorage.setItem('returnUrl', this._router.url); // Guarda la URL actual en sessionStorage
    this._router.navigate(
      ['/', this.locale, this.country, 'account', 'myaddresses', 'add'],
      { queryParams: { email } }
    );
  }

  public login() {
    if (!this.email_identify) {
      alertDanger('Es necesario ingresar el email');
    }

    if (!this.password_identify) {
      alertDanger('Es necesario ingresar el password');
    }

    const subscriptionLogin = this._authService
      .login(this.email_identify, this.password_identify)
      .subscribe((resp: any) => {
        if (!resp.error && resp) {
          this._router
            .navigate(['/', this.country, this.locale, 'account', 'checkout'])
            .then(() => {
              window.location.reload();
            });
          this._cartService.resetCart();
        } else {
          this.errorAutenticate = true;
          this.errorMessageAutenticate = resp.error.message;
        }
      });
    this.subscriptions.add(subscriptionLogin);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkDeviceType(); // Verifica el tamaño de la pantalla
  }

  /**
   * Obtiene el precio unitario final (con descuento si aplica)
   * IMPORTANTE: price_unitario YA viene validado y calculado desde el backend
   */
  getFinalUnitPrice(detail: any): number {
    // price_unitario ya viene con el cálculo correcto desde el backend
    const finalPrice = parseFloat(detail.price_unitario || 0);
    
    if (finalPrice > 0) {
      return finalPrice;
    }
    
    // Fallback: usar retail_price si price_unitario no está disponible
    return parseFloat(detail.variedade?.retail_price || 0);
  }

  /**
   * Calcula el subtotal original (sin descuentos) de todos los productos
   */
  getOriginalSubtotal(): number {
    if (!this.saleDetails || this.saleDetails.length === 0) {
      return 0;
    }
    return this.saleDetails.reduce((total: number, sale: any) => {
      const originalPrice = parseFloat(sale.variedade?.retail_price || sale.price_unitario || 0);
      return total + (originalPrice * (sale.cantidad || 1));
    }, 0);
  }

  /**
   * Calcula el subtotal con precios finales (después de descuentos)
   * Total = suma de (price_unitario * cantidad) SIN redondeo adicional
   */
  getSubtotal(): number {
    if (!this.saleDetails || this.saleDetails.length === 0) {
      return this.totalCarts || this.sale?.total || 0;
    }

    const calculatedSubtotal = this.saleDetails.reduce((total: number, detail: any) => {
      const finalPrice = this.getFinalUnitPrice(detail);
      const itemSubtotal = finalPrice * (detail.cantidad || 1);
      return total + itemSubtotal;
    }, 0);

    return parseFloat(calculatedSubtotal.toFixed(2));
  }

  /**
   * Calcula el total de descuento aplicado - diferencia entre subtotal original y subtotal final
   */
  getTotalDiscount(): number {
    const originalSubtotal = this.getOriginalSubtotal();
    const finalSubtotal = this.getSubtotal();
    const discount = parseFloat(Math.max(0, originalSubtotal - finalSubtotal).toFixed(2));
    
    // 🔍 DEBUG LOG
    // console.log('💵 [SUCCESSFULL-CHECKOUT] getTotalDiscount:', {
    //   originalSubtotal: originalSubtotal.toFixed(2),
    //   finalSubtotal: finalSubtotal.toFixed(2),
    //   discount: discount.toFixed(2)
    // });
    
    return discount;
  }

  /**
   * Calcula el total final (subtotal + envío - descuentos)
   */
  getTotal(): number {
    const subtotal = this.getSubtotal();
    
    return subtotal; // Envío es gratis, así que total = subtotal final
  }

  /**
   * Verifica si hay algún producto en el carrito con descuento (para usar en template)
   */
  hasAnyCartDiscount(): boolean {
    if (!this.saleDetails || this.saleDetails.length === 0) {
      return false;
    }
    return this.saleDetails.some((sale: any) => this.hasCartItemDiscount(sale));
  }

  /**
   * Método de debug para inspeccionar completamente la estructura de saleDetails
   */
  debugSaleDetailsStructure(): void {
  
    if (this.saleDetails && this.saleDetails.length > 0) {
      this.saleDetails.forEach((detail: any, index: number) => {
      });
    }
  }

  /**
   * Verifica si el item específico tiene descuento aplicado
   * Solo muestra descuento si type_campaign es válido (validado en backend)
   */
  hasCartItemDiscount(detail: any): boolean {
    // type_campaign: 1=Campaign, 2=Flash Sale, 3=Cupón
    // Solo mostrar descuento si type_campaign está presente y discount > 0
    return detail.type_campaign && 
           [1, 2, 3].includes(detail.type_campaign) && 
           parseFloat(detail.discount || 0) > 0;
  }

  /**
   * Verifica si un producto individual tiene descuento real aplicado (método legacy)
   */
  hasProductDiscount(sale: any): boolean {
    return this.hasCartItemDiscount(sale);
  }

  /**
   * Verifica si hay algún producto con descuento (alias para compatibilidad)
   */
  hasAnyProductWithDiscount(): boolean {
    return this.hasAnyCartDiscount();
  }

  /**
   * Obtiene el tipo de descuento aplicado a un detalle de venta
   * @param detail Detalle de la venta
   * @returns String con el tipo de descuento
   */
  getDiscountType(detail: any): string {
    if (!detail || !this.hasCartItemDiscount(detail)) return '';
    
    // Usar type_campaign validado en backend
    // type_campaign: 1=Campaign Discount, 2=Flash Sale, 3=Cupón
    if (detail.type_campaign === 3) {
      return `Cupón ${detail.code_cupon || ''}`;
    } else if (detail.type_campaign === 2) {
      return 'Flash Sale';
    } else if (detail.type_campaign === 1) {
      return 'Campaign Discount';
    }
    
    return '';
  }

  /**
   * Obtiene el porcentaje de descuento aplicado
   * @param detail Detalle de la venta
   * @returns Porcentaje de descuento
   */
  getDiscountPercentage(detail: any): number {
    if (!detail || !this.hasCartItemDiscount(detail)) return 0;
    
    // Si type_discount es 1 (porcentual), usar directamente el valor de discount
    if (detail.type_discount === 1 && detail.discount > 0) {
      return Math.round(parseFloat(detail.discount));
    }
    
    // Si type_discount es 2 (fijo), calcular porcentaje
    const originalPrice = parseFloat(detail.variedade?.retail_price || 0);
    const discountAmount = parseFloat(detail.discount || 0);
    
    if (originalPrice <= 0 || discountAmount <= 0) return 0;
    
    return Math.round((discountAmount / originalPrice) * 100);
  }

  /**
   * 🆕 Cargar información completa del módulo desde backend
   */
  loadModuleInfo(moduleId: number) {
    this._authEcommerce.getModuleById(moduleId).subscribe(
      (resp: any) => {
        this.moduleType = resp.module.type; // 'digital', 'service', 'physical', 'integration'
        this.moduleName = resp.module.name;
        console.log('[Successfull] ✅ Module info loaded:', {
          name: this.moduleName,
          type: this.moduleType
        });
      },
      (error) => {
        console.error('[Successfull] ❌ Error loading module:', error);
        // Fallback a tipo 'digital' si falla
        this.moduleType = 'digital';
        this.moduleName = 'Módulo';
      }
    );
  }

  /**
   * Determina si la compra requiere envío físico
   * Solo módulos con type='physical' requieren dirección de envío
   */
  requiresShipping(): boolean {
    return this.moduleType === 'physical' || !this.isModulePurchase;
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    // Ajusta el tamaño de la imagen según el tipo de dispositivo
    if (this.isMobile) {
      this.width = 80; // tamaño para móviles
      this.height = 80; // tamaño para móviles
    } else {
      this.width = 100; // tamaño por defecto
      this.height = 100; // tamaño por defecto
    }
  }

  ngOnDestroy(): void {
    // 🔒 Limpiar flag de visita cuando el usuario navega fuera de la página
    sessionStorage.removeItem('visited_success_page');
    sessionStorage.removeItem('checkout_sale_data');
    
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
