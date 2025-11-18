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
    console.log('[Checkout Success] ngOnInit - session_id from URL:', sessionId);

    if (sessionId) {
      this.fetchSaleWithRetry(sessionId);
    } else {
      // No session_id -> possibly PayPal flow. Try to load sale data from several fallbacks
      console.log('[Checkout Success] No session_id in URL, attempting PayPal fallbacks (checkoutService, navigation state, sessionStorage)');

      // 1) Try CheckoutService (synchronous)
      try {
        const svcData = this.checkoutService.getSaleData();
        if (svcData && (svcData.sale || svcData.saleDetails)) {
          console.log('[Checkout Success] Loaded saleData from CheckoutService');
          this.saleData = svcData;
          this.sale = svcData.sale || svcData;
          this.saleDetails = svcData.saleDetails || svcData.saleDetails || [];
          console.log('1) [Checkout Success] saleData:', this.saleData);
          
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
          console.log('[Checkout Success] Loaded saleData from navigation state');
          this.saleData = navState;
          this.sale = navState.sale || navState;
          this.saleDetails = navState.saleDetails || [];
          console.log('2) [Checkout Success] saleData:', this.saleData);
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
            console.log('[Checkout Success] Loaded saleData from sessionStorage');
            this.saleData = parsed;
            this.sale = parsed.sale || parsed;
            this.saleDetails = parsed.saleDetails || [];
            console.log('3) [Checkout Success] saleData:', this.saleData);
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
      console.log('[Checkout Success] Cleaning URL params, replacing state with:', cleanPath);
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
      console.warn('[Checkout Success] Venta aún no disponible en backend. session_id=', sessionId);
      console.warn('[Checkout Success] Llamando fallback registerStripeSale() para intentar crear la venta desde frontend');
      // alertDanger('La venta aún no se ha registrado. Por favor, contacta soporte si el pago se completó.');
      return;
    }

    console.log(`[Checkout Success] Attempting to fetch sale by session. Tries left: ${tries}`, sessionId);

    this._authEcommerce.getSaleBySession(sessionId).subscribe(
      (resp) => {
        if (resp?.sale) {
          console.log('[Checkout Success] Sale found for session:', sessionId, resp.sale.id);
          this.saleData = resp.sale;
          this.saleDetails = resp.saleDetails;

          // Calcular total de la venta
          this.totalCarts = this.saleDetails.reduce(
            (sum: number, it: any) =>
              sum + Number(it.discount ?? it.code_discount ?? it.unitPrice ?? it.price_unitario) * it.cantidad,
            0
          );
          this.totalCarts = parseFloat(this.totalCarts.toFixed(2));

          // Actualizar checkoutService para que successPayStripe() funcione
          this.checkoutService.setSaleData({ sale: this.saleData, saleDetails: this.saleDetails });
          this.checkoutService.setSaleSuccess(true);
          
          // DEBUG: Inspeccionar estructura después de cargar datos
          setTimeout(() => this.debugSaleDetailsStructure(), 100);
          
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
    // Initial synchronous load from CheckoutService
    const initialData = this.checkoutService.getSaleData();
    if (initialData?.sale) {
      const saleInfo = initialData.sale;
      const saleDetails = initialData.saleDetails || [];
      this.sale = saleInfo;
      // Calculate total immediately using final prices (with discounts)
      this.totalCarts = saleDetails.reduce((sum: number, item: any) => {
        const finalPrice = Number(
          item.discount ?? item.code_discount ?? item.variedade?.retail_price ?? item.price_unitario ?? 0
        );
        return sum + finalPrice * item.cantidad;
      }, 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      this.saleDetails = saleDetails;
      console.log("SuccessPayStripe :", this.saleDetails);
      
    }
    // Subscribe to updates (e.g., after Stripe)
    this.checkoutService.saleData$.subscribe((saleDataPayload) => {
      const saleInfo = saleDataPayload?.sale;
      const saleDetails = saleDataPayload?.saleDetails || [];
      if (saleInfo) {
        this.sale = saleInfo;
        this.totalCarts = saleDetails.reduce((sum: number, item: any) => {
          const finalPrice = Number(
            item.discount ?? item.code_discount ?? item.variedade?.retail_price ?? item.price_unitario ?? 0
          );
          return sum + finalPrice * item.cantidad;
        }, 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
        this.saleDetails = saleDetails;
      }
    });
  }

  /*
  registerStripeSale() {
     const payload = this.checkoutService.getSalePayload();
     if (!payload) {
       alertDanger('No se encontraron los datos necesarios de la venta.');
       return;
     }

     const sessionId = this.routerActived.snapshot.queryParamMap.get('session_id');

     
     const nTransaction = sessionId
       ? `STRIPE_${sessionId}`
       : `STRIPE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

     const sale = {
       user: payload.userId,
       guestId: payload.guestId,
       currency_payment: 'EUR',
       method_payment: 'STRIPE',
       n_transaction: nTransaction,
       stripeSessionId: sessionId || null,
       total: parseFloat(
         payload.cart
           .reduce((sum: number, item: any) => {
             const price = Number(
               item.variedade?.retail_price ??
                 item.price_unitario ??
                 item.product?.price_usd ??
                 0
             );
             return sum + price * item.cantidad;
           }, 0)
           .toFixed(2)
       ),
     };

     const sale_address = payload.address;
     const isGuest = !payload.userId;

     this._authEcommerce.registerSale({ sale, sale_address }, isGuest).subscribe(
       (resp: any) => {
         if (resp.code === 403) {
           alertDanger(resp.message);
           return;
         }

         alertSuccess(resp.message);
         this.checkoutService.setSaleData(resp);
         this.checkoutService.setSaleSuccess(true);
         this._cartService.resetCart();
         this.checkoutService.setSaleSuccess(true);

        this.minDeliveryDate = resp?.deliveryEstimate?.min || null;
        this.maxDeliveryDate = resp?.deliveryEstimate?.max || null;

        this.saleData = resp;
        this.successPayStripe();
      },
      (err) => {
        alertDanger('Ocurrió un error al registrar la venta con Stripe.');
        console.error(err);
      }
    );
  }*/

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



  // public getImageUrl(sale: any): string {
  //   try {
  //     if (!sale) return '';
  //     // Preferencia: campo 'imagen' del producto (ya rellenado por backend)
  //     const prodImg = sale.product && (sale.product.imagen || sale.product.image || sale.product.portada);
  //     if (prodImg) return prodImg;

  //     // Variante (forma 'variedad') con Files
  //     const filesA = sale.variedad && sale.variedad.Files;
  //     if (Array.isArray(filesA) && filesA.length > 0) {
  //       return filesA[0].preview_url || filesA[0].thumbnail_url || filesA[0].url || '';
  //     }

  //     // Variante en otra convención (variedade)
  //     const filesB = sale.variedade && sale.variedade.Files;
  //     if (Array.isArray(filesB) && filesB.length > 0) {
  //       return filesB[0].preview_url || filesB[0].thumbnail_url || filesB[0].url || '';
  //     }

  //     return '';
  //   } catch (e) {
  //     console.warn('[SuccessfullCheckout] getImageUrl error:', e);
  //     return '';
  //   }
  // }

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
    const originalPrice = parseFloat(detail.variedade?.retail_price || detail.price_unitario || 0);

    // DEBUG: Log para entender la estructura de datos
    console.log('🔍 DEBUG SuccessfullCheckout getFinalUnitPrice:', {
      product: detail.product?.title,
      originalPrice: originalPrice,
      discount: detail.discount,
      code_discount: detail.code_discount,
      type_discount: detail.type_discount,
      code_cupon: detail.code_cupon,
      hasCupon: !!detail.code_cupon
    });

    // Si no hay descuento aplicado, retornar precio original
    if (!detail.discount && !detail.code_discount) {
      console.log('✅ No discount found, returning original price:', originalPrice);
      return originalPrice;
    }

    // En saleDetails (ventas completadas), distinguir entre cupones y campaign discounts
    const isCupon = !!detail.code_cupon;
    let discountValue = parseFloat(detail.code_discount || detail.discount || 0);

    console.log('🎯 Discount Analysis (saleDetails):', {
      isCupon: isCupon,
      discountValue: discountValue,
      type_discount: detail.type_discount,
      interpretation: isCupon ? 'CUPON - apply percentage/fixed logic' : 'CAMPAIGN - discount value is final price'
    });

    if (isCupon) {
      // CUPONES REALES: Usar type_discount para determinar cómo procesar
      let finalPrice;
      
      if (detail.type_discount === 1) {
        // Cupón porcentual
        console.log('📊 CUPON: Processing as PERCENTAGE:', discountValue + '%');
        finalPrice = originalPrice * (1 - discountValue / 100);
      } else {
        // Cupón de monto fijo
        console.log('💰 CUPON: Processing as FIXED AMOUNT to subtract:', discountValue);
        finalPrice = originalPrice - discountValue;
      }

      // Aplicar redondeo a .95 para cupones
      const finalWithRounding = this.priceCalculationService.applyRoundingTo95(finalPrice);
      console.log('🔄 CUPON: Applied .95 rounding:', finalPrice, '→', finalWithRounding);
      return finalWithRounding;
      
    } else {
      // CAMPAIGN/FLASH DISCOUNTS: El valor discount YA ES EL PRECIO FINAL
      console.log('🏷️ CAMPAIGN: Using discount value as final price:', discountValue);
      
      // Aplicar redondeo a .95 para campaign discounts también
      const finalWithRounding = this.priceCalculationService.applyRoundingTo95(discountValue);
      console.log('🔄 CAMPAIGN: Applied .95 rounding:', discountValue, '→', finalWithRounding);
      return finalWithRounding;
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
      return 0;
    }
    return this.saleDetails.reduce((total: number, sale: any) => {
      const finalPrice = this.getFinalUnitPrice(sale);
      return total + (finalPrice * (sale.cantidad || 1));
    }, 0);
  }

  /**
   * Calcula el total de descuento aplicado - diferencia entre subtotal original y subtotal final
   */
  getTotalDiscount(): number {
    const originalSubtotal = this.getOriginalSubtotal();
    const finalSubtotal = this.getSubtotal();
    return parseFloat(Math.max(0, originalSubtotal - finalSubtotal).toFixed(2));
  }

  /**
   * Calcula el total final (subtotal + envío - descuentos)
   */
  getTotal(): number {
    return this.getSubtotal(); // Envío es gratis, así que total = subtotal final
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
    console.log('🚀 COMPLETE SALE DETAILS STRUCTURE:', {
      saleData: this.saleData,
      saleDetails: this.saleDetails,
      totalCarts: this.totalCarts
    });
    
    if (this.saleDetails && this.saleDetails.length > 0) {
      console.log('📦 SALE DETAILS ITEMS:');
      this.saleDetails.forEach((detail: any, index: number) => {
        console.log(`Item ${index + 1}:`, {
          product_title: detail.product?.title,
          all_fields: Object.keys(detail),
          price_related_fields: {
            price_unitario: detail.price_unitario,
            retail_price: detail.variedade?.retail_price,
            discount: detail.discount,
            code_discount: detail.code_discount,
            type_discount: detail.type_discount,
            code_cupon: detail.code_cupon,
            campaing_discount: detail.campaing_discount,
            flash_discount: detail.flash_discount,
            precio_original: detail.precio_original,
            precio_final: detail.precio_final,
            precio_descuento: detail.precio_descuento
          }
        });
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
    
    // DEBUG
    console.log('🔍 DEBUG hasCartItemDiscount:', {
      product: detail.product?.title,
      originalPrice: originalPrice,
      finalPrice: finalPrice,
      hasDiscount: finalPrice < originalPrice
    });
    
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
