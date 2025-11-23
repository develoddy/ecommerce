import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  Output,
  HostListener,
  EventEmitter,
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
    private priceCalculationService: PriceCalculationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    const sessionId = this.routerActived.snapshot.queryParamMap.get('session_id');

    if (sessionId) {
      this.fetchSaleWithRetry(sessionId, 20, 2000);
    } else {
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
          this.successPayStripe();
          return;
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading CheckoutService saleData fallback', e);
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
          this.successPayStripe();
          return;
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading navigation state fallback', e);
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
            this.successPayStripe();
            return;
          }
        }
      } catch (e) {
        console.warn('[Checkout Success] Error reading sessionStorage fallback', e);
      }
    }

    // Limpiar parámetros de URL para evitar re-procesar en recarga
    if (sessionId) {
      const cleanPath = this._router.url.split('?')[0];
     
      this.location.replaceState(cleanPath);
    }

    this.activate.emit(true);
    this.subscriptionService.setShowSubscriptionSection(false);

    this._authEcommerce.loading$.subscribe((isLoading) => {
      this.loading = isLoading;
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

  successPayStripe() {
    //console.log('[Frontend] 🚀 successPayStripe() called');
    
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
        this.checkIfAddressClientExists();
      } else {
        this._authEcommerce._authService.userGuest.subscribe((guestUser) => {
          if (guestUser?.guest) {
            this.CURRENT_USER_GUEST = guestUser;
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

  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.locale, this.country, 'shop', 'home']);
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

    // 4️⃣ Fallback al producto
    return sale.product?.imagen || sale.product?.portada || '';
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
            .navigate(['/', this.locale, this.country, 'account', 'checkout'])
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
   * Obtiene el precio unitario final (con descuento si aplica) - adaptado para saleDetails
   */
  getFinalUnitPrice(detail: any): number {
    // 🔍 DEBUG LOG
    console.log('💰 [SUCCESSFULL-CHECKOUT] getFinalUnitPrice:', {
      productTitle: detail.product?.title,
      price_unitario: detail.price_unitario,
      retail_price: detail.variedade?.retail_price,
      discount: detail.discount,
      code_discount: detail.code_discount,
      type_campaign: detail.type_campaign
    });
    
    // IMPORTANTE: price_unitario YA viene calculado y guardado en la BD
    // NO necesitamos recalcular aquí
    const savedFinalPrice = parseFloat(detail.price_unitario || 0);
    
    if (savedFinalPrice > 0) {
      console.log('   ✅ Usando price_unitario guardado:', savedFinalPrice);
      return savedFinalPrice;
    }
    
    // Fallback: calcular desde retail_price solo si price_unitario no existe
    const originalPrice = parseFloat(detail.variedade?.retail_price || 0);
    console.log('   ⚠️ price_unitario no disponible, usando retail_price:', originalPrice);
   
    // Si no hay descuento aplicado, retornar precio original
    if (!detail.discount && !detail.code_discount) {
      console.log('   → Sin descuento, retornando original');
      return originalPrice;
    }

    // En saleDetails (ventas completadas), distinguir entre cupones, flash sales y campaign discounts
    // Método 1: Detectar por code_cupon (cupones reales)
    let isCupon = !!detail.code_cupon;
    
    // Método 2: Detectar Flash Sale por code_discount (sin code_cupon)
    let isFlashSale = !detail.code_cupon && !!detail.code_discount;
    
    let discountValue = parseFloat(detail.code_discount || detail.discount || 0);
    
    // Si no es cupón ni flash sale, aplicar heurística para distinguir campaign discount
    if (!isCupon && !isFlashSale && discountValue > 0) {
      // Heurística: Los cupones suelen tener valores "redondos" como 5, 10, 20, 50, 90
      // Los campaign discounts suelen tener decimales como 18.95, 20.95
      const isLikelyPercentage = (discountValue <= 100 && discountValue % 1 === 0); // Número entero ≤ 100
      
      // Si parece un porcentaje (número entero ≤ 100), probablemente es cupón
      if (isLikelyPercentage) {
        isCupon = true;
        //console.log('🧠 SMART DETECTION: Detected as COUPON by pattern (integer ≤ 100, likely percentage)');
      }
    }

    if (isCupon) {
      // CUPONES REALES: Usar type_discount para determinar cómo procesar
      let finalPrice;
      
      if (detail.type_discount === 1) {
        // Cupón porcentual
        //console.log('📊 CUPON: Processing as PERCENTAGE:', discountValue + '%');
        finalPrice = originalPrice * (1 - discountValue / 100);
      } else {
        // Cupón de monto fijo
        //console.log('💰 CUPON: Processing as FIXED AMOUNT to subtract:', discountValue);
        finalPrice = originalPrice - discountValue;
      }

      // Aplicar redondeo a .95 para cupones
      const finalWithRounding = this.priceCalculationService.applyRoundingTo95(finalPrice);
      //console.log('🔄 CUPON: Applied .95 rounding:', finalPrice, '→', finalWithRounding);
      return finalWithRounding;
      
    } else if (isFlashSale) {
      // FLASH SALE: Usar type_discount para determinar si es porcentaje o fijo
      let finalPrice;
      
      if (detail.type_discount === 1) {
        // Flash Sale porcentual
        //console.log('🔥 FLASH SALE: Processing as PERCENTAGE:', discountValue + '%');
        finalPrice = originalPrice * (1 - discountValue / 100);
      } else if (detail.type_discount === 2) {
        // Flash Sale monto fijo
        finalPrice = originalPrice - discountValue;
      } else {
        // Default: tratar como porcentaje
        finalPrice = originalPrice * (1 - discountValue / 100);
      }

      // Aplicar redondeo a .95 para flash sales
      const finalWithRounding = this.priceCalculationService.applyRoundingTo95(Math.max(0, finalPrice));
      //console.log('🔄 FLASH SALE: Applied .95 rounding:', finalPrice, '→', finalWithRounding);
      return finalWithRounding;
      
    } else {
      // CAMPAIGN DISCOUNTS: El valor discount ES SIEMPRE EL PRECIO FINAL
      // Verificar que el precio final sea lógico (menor que el precio original)
      if (discountValue > 0 && discountValue < originalPrice) {
        const finalWithRounding = this.priceCalculationService.applyRoundingTo95(discountValue);
        //console.log('🔄 CAMPAIGN: Applied .95 rounding:', discountValue, '→', finalWithRounding);
        return finalWithRounding;
      } else {
        // Si el discount no parece ser un precio final válido, usar precio original
        return originalPrice;
      }
    }
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
   */
  getSubtotal(): number {
    if (!this.saleDetails || this.saleDetails.length === 0) {
      // Fallback: usar totalCarts calculado previamente o sale.total
      const fallbackTotal = this.totalCarts || this.sale?.total || 0;
      return fallbackTotal;
    }

    const calculatedSubtotal = this.saleDetails.reduce((total: number, sale: any) => {
      const finalPrice = this.getFinalUnitPrice(sale);
      const itemSubtotal = finalPrice * (sale.cantidad || 1);
      
      return total + itemSubtotal;
    }, 0);

    return calculatedSubtotal;
  }

  /**
   * Calcula el total de descuento aplicado - diferencia entre subtotal original y subtotal final
   */
  getTotalDiscount(): number {
    const originalSubtotal = this.getOriginalSubtotal();
    const finalSubtotal = this.getSubtotal();
    const discount = parseFloat(Math.max(0, originalSubtotal - finalSubtotal).toFixed(2));
    
    // 🔍 DEBUG LOG
    console.log('💵 [SUCCESSFULL-CHECKOUT] getTotalDiscount:', {
      originalSubtotal: originalSubtotal.toFixed(2),
      finalSubtotal: finalSubtotal.toFixed(2),
      discount: discount.toFixed(2)
    });
    
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
   */
  hasCartItemDiscount(detail: any): boolean {
    // Verificar si existe discount o code_discount
    if (!detail.discount && !detail.code_discount) return false;
    
    const originalPrice = parseFloat(detail.variedade?.retail_price || detail.price_unitario || 0);
    const finalPrice = this.getFinalUnitPrice(detail);
    
    // Verificar si el precio final es menor al original (hay descuento real)
    return finalPrice < originalPrice && finalPrice > 0;
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
    
    // 🔍 DEBUG LOG
    console.log('🏷️ [SUCCESSFULL-CHECKOUT] getDiscountType:', {
      productTitle: detail.product?.title,
      saleDetailId: detail.id,
      type_campaign: detail.type_campaign,
      code_cupon: detail.code_cupon,
      code_discount: detail.code_discount,
      discount: detail.discount
    });
    
    // Usar type_campaign para identificar el tipo de descuento
    // type_campaign: 1=Campaign Discount, 2=Flash Sale, 3=Cupón
    if (detail.type_campaign === 3 || detail.code_cupon) {
      console.log('   ✅ Detectado: Cupón');
      return `Cupón ${detail.code_cupon || ''}`;
    } else if (detail.type_campaign === 2) {
      console.log('   ✅ Detectado: Flash Sale');
      return 'Flash Sale';
    } else if (detail.type_campaign === 1) {
      console.log('   ✅ Detectado: Campaign Discount');
      return 'Campaign Discount';
    }
    
    // Fallback para ventas sin type_campaign
    console.log('   ⚠️ Usando fallback (type_campaign NULL)');
    if (detail.code_cupon) {
      console.log('   → Cupón (fallback)');
      return `Cupón ${detail.code_cupon}`;
    } else if (detail.code_discount) {
      console.log('   → Flash Sale (fallback por code_discount)');
      return 'Flash Sale';
    } else {
      console.log('   → Campaign Discount (fallback)');
      return 'Campaign Discount';
    }
  }

  /**
   * Obtiene el porcentaje de descuento aplicado
   * @param detail Detalle de la venta
   * @returns Porcentaje de descuento
   */
  getDiscountPercentage(detail: any): number {
    if (!detail || !this.hasCartItemDiscount(detail)) return 0;
    
    // Usar el descuento almacenado en la base de datos
    if (detail.discount && detail.discount > 0) {
      return Math.round(parseFloat(detail.discount));
    }
    
    // Fallback: calcular basado en precios
    const originalPrice = parseFloat(detail.variedade?.retail_price || detail.price_unitario || 0);
    const finalPrice = this.getFinalUnitPrice(detail);
    
    if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;
    
    const discountAmount = originalPrice - finalPrice;
    return Math.round((discountAmount / originalPrice) * 100);
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
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
