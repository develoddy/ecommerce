import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Output, EventEmitter, HostListener, ChangeDetectorRef } from '@angular/core';
import { forkJoin, Subscription, take } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AddressValidationService } from '../../_services/address-validation.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { Address, CheckoutService } from '../../_services/checkoutService';
import { MinicartService } from 'src/app/services/minicartService.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-resumen-checkout',
  templateUrl: './resumen-checkout.component.html',
  styleUrls: ['./resumen-checkout.component.css']
})

export class ResumenCheckoutComponent implements OnInit {

  @ViewChild('paypal',{static: true}) paypalElement?: ElementRef;
  euro = "€";
  selectedAddress: Address | null = null;
  listAddressClients:any = [];
  listAddressGuest:any = [];
  // Address
  name: string = '';
  surname: string = '';
  pais: string = '';
  calle: string = ''; // Nombre de la calle
  numero: string = ''; // Número de la calle (obligatorio)
  apartamento: string = ''; // Apartamento/Piso (opcional)
  address: string = ''; // Dirección completa (se genera combinando calle + numero + apartamento)
  zipcode: string = '';
  poblacion: string = '';
  ciudad: string = '';
  email: string = '';
  phone: string = '';
  usual_shipping_address:boolean=false;
  isValidating: boolean = false;
  validationMessage: string = '';
  address_client_selected:any = null;
  listCarts:any = [];
  totalCarts:any=null;
  show = false;
  // Estado del formulario de dirección
  showAddressForm = false;
  isEditMode = false;
  editingAddressId: number | null = null;
  user:any;
  code_cupon:any=null;
  sale: any;
  saleDetails: any =[];
  isSaleSuccess = false;
  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd : boolean = false;
  public loading: boolean = false;
  isLastStepActive_2: boolean = false;
  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  password_identify:string = "";
  email_identify:string = "";
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  selectedAddressId:  number = 0;
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;
  private subscriptions: Subscription = new Subscription();
  @Output() activate = new EventEmitter<boolean>();
  isPasswordVisible: boolean = false;
  locale: string = "";
  country: string = "";
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  width: number = 100; 
  height: number = 100; 
  shippingRate: number = 0;
  fechaEntregaMin: string = '';
  fechaEntregaMax: string = '';
  shippingMethod: string = '';
  fechaEntregaMinISO: string = '';
  fechaEntregaMaxISO: string = '';
  fechaEntregaLabel: string = '';
  fechaEntregaISO: string = '';
  entregaUnica: boolean = false;

  fallbackAddress = {
    address: 'Gran Vía, 1',
    ciudad: 'Madrid',
    pais: 'España',
    zipcode: '28013'
  };
  
  usandoFallback: boolean = false;

  // 🎯 Propiedades de validación de código postal (tipo Mango.es)
  availableCities: Array<{city: string, isPrimary: boolean}> = [];
  isLoadingPostalCode: boolean = false;
  isProvinceReadonly: boolean = true;
  postalCodeError: string = '';
  cityError: string = '';

  constructor(
    public _authEcommerce: EcommerceAuthService,
    private addressValidationService: AddressValidationService,
    public _authService: AuthService,
    public _cartService: CartService,
    public _router: Router,
    private minicartService: MinicartService,
    private subscriptionService: SubscriptionService,
    public routerActived: ActivatedRoute,
    private checkoutService: CheckoutService,
    private cdr: ChangeDetectorRef,
    private priceCalculationService: PriceCalculationService
  ) {
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  
      this.country = params.get('country') || 'es'; 
    });
  }

  /**
   * Obtiene la lista de países europeos soportados
   */
  get supportedCountries() {
    return this.addressValidationService.EUROPEAN_COUNTRIES;
  }

  /**
   * 🎯 Método tipo Mango.es: Autocompletar provincia y ciudades al ingresar código postal
   * Se ejecuta cuando el usuario termina de escribir el CP (blur o change)
   */
  onZipCodeChange(zipCode: string) {
    // Limpiar errores previos
    this.postalCodeError = '';
    this.cityError = '';
    
    // Validar longitud mínima (España: 5 dígitos)
    if (!zipCode || zipCode.length < 5) {
      this.availableCities = [];
      this.ciudad = ''; // Limpiar provincia
      this.poblacion = ''; // Limpiar ciudad
      return;
    }

    this.isLoadingPostalCode = true;
    const countryCode = this.addressValidationService.getCountryCode(this.pais || 'ES');
    
    console.log(`🔍 [ResumenCheckout] Buscando CP ${zipCode} en ${countryCode}`);
    
    this.addressValidationService.getPostalCodeInfo(countryCode, zipCode)
      .subscribe({
        next: (info) => {
          this.isLoadingPostalCode = false;
          
          if (!info || !info.exists) {
            // ❌ Código postal no encontrado
            this.postalCodeError = `El código postal ${zipCode} no existe en ${this.pais || 'España'}`;
            this.availableCities = [];
            this.ciudad = '';
            this.poblacion = '';
            console.log(`❌ [ResumenCheckout] CP ${zipCode} no encontrado`);
            return;
          }
          
          // ✅ CP encontrado - autocompletar provincia (readonly)
          console.log(`✅ [ResumenCheckout] CP ${zipCode} encontrado:`, info);
          this.ciudad = info.province; // Autocompletar provincia
          this.availableCities = info.cities;
          
          // Si solo hay una ciudad, autoseleccionarla
          if (info.cities.length === 1) {
            this.poblacion = info.cities[0].city;
            console.log(`✅ [ResumenCheckout] Ciudad autoseleccionada: ${this.poblacion}`);
          } else if (info.cities.length > 1) {
            // Múltiples ciudades - usuario debe seleccionar
            this.poblacion = ''; // Limpiar para forzar selección manual
            console.log(`ℹ️ [ResumenCheckout] ${info.cities.length} ciudades disponibles para CP ${zipCode}`);
          }
        },
        error: (err) => {
          console.error('❌ Error buscando código postal:', err);
          this.isLoadingPostalCode = false;
          this.postalCodeError = 'Error al validar el código postal. Por favor intenta de nuevo.';
          this.availableCities = [];
        }
      });
  }

  ngAfterViewInit() {}

  ngOnInit(): void {
    this.verifyAuthenticatedUser();
    this.currentDataCart();
    this.checkDeviceType();
    setTimeout(() => {
      this.loadLoading();
      setTimeout(() => {
        HOMEINITTEMPLATE($);
        actionNetxCheckout($);
      }, 150);
    }, 1000);
  }

  loadShippingRateWithAddress(address: any, items: {variant_id: number, quantity: number}[], isFallback: boolean = false) {
    
    // Si address es un array, tomamos el primero
    const addressObj = Array.isArray(address) ? address[0] : address;

    // Si la dirección está incompleta, no seguimos
    if (
      !addressObj ||
      !addressObj.address ||
      !addressObj.ciudad ||
      !addressObj.zipcode ||
      !addressObj.pais
    ) {
      console.warn("Dirección incompleta:", addressObj);
      this.shippingRate = 0;
      this.shippingMethod = '';
      this.fechaEntregaMin = '';
      this.fechaEntregaMax = '';
      return;
    }

    this.address = addressObj.address;
    this.usandoFallback = isFallback;

    // Usar el servicio de validación para obtener el código de país
    const countryCode = this.addressValidationService.getCountryCode(addressObj.pais);

    // Verificar si el país está soportado
    if (!this.addressValidationService.isCountrySupported(countryCode)) {
      console.warn("País no permitido:", countryCode);
      alertWarning(`Lo sentimos, no realizamos envíos a ${addressObj.pais}. Solo enviamos a países de la Unión Europea.`);
      this.shippingRate = 0;
      this.shippingMethod = '';
      this.fechaEntregaMin = '';
      this.fechaEntregaMax = '';
      return;
    }

    const payload = {
      recipient: {
        address1: addressObj.address,
        city: addressObj.ciudad || addressObj.poblacion,
        country_code: countryCode,
        zip: addressObj.zipcode,
        state_code: addressObj.ciudad || addressObj.poblacion
      },
      items: items,
      currency: 'EUR',
      locale: 'es_ES'
    };

    this._authEcommerce.getShippingRates(payload).subscribe({
      next: (res:any) => {
        console.log("✅ Tarifas de envío recibidas:", res);
        const rate = res.result?.[0];
        if (rate) {
          this.shippingRate = parseFloat(rate.rate);

          const fechaMinRaw = new Date(rate.minDeliveryDate);
          const fechaMaxRaw = new Date(rate.maxDeliveryDate);

          /** 🚀 AÑADIR MARGEN DE +7 DÍAS */
          const fechaMaxConMargen = new Date(fechaMaxRaw);
          fechaMaxConMargen.setDate(fechaMaxConMargen.getDate() + 7);

          const fechaMin = this.formatearFechaEntrega(fechaMinRaw.toISOString());
          const fechaMax = this.formatearFechaEntrega(fechaMaxConMargen.toISOString());

          if (fechaMin.label === fechaMax.label) {
            this.fechaEntregaLabel = fechaMin.label;
            this.fechaEntregaISO = fechaMin.datetime;
            this.entregaUnica = true;
          } else {
            this.fechaEntregaMin = fechaMin.label;
            this.fechaEntregaMax = fechaMax.label;
            this.fechaEntregaMinISO = fechaMin.datetime;
            this.fechaEntregaMaxISO = fechaMax.datetime;
            this.entregaUnica = false;
          }

          this.shippingMethod = rate.name;
        } else {
          alertWarning('No se pudo calcular el envío para esta dirección. Verifica que todos los datos sean correctos.');
          this.shippingRate = 0;
          this.shippingMethod = '';
          this.fechaEntregaMin = '';
          this.fechaEntregaMax = '';
        }
      },
      error: (err) => {
        console.error("❌ Error al calcular tarifas de envío", err);
        
        // Mostrar mensaje más específico según el error
        let errorMessage = 'No se pudo calcular el envío para esta dirección.';
        if (err.error?.error?.message) {
          const printfulError = err.error.error.message.toLowerCase();
          if (printfulError.includes('zip') || printfulError.includes('postal')) {
            errorMessage = 'El código postal no es válido para este país.';
          } else if (printfulError.includes('address')) {
            errorMessage = 'La dirección no es válida. Verifica que todos los datos sean correctos.';
          }
        }
        
        alertDanger(errorMessage);
        this.shippingRate = 0;
        this.shippingMethod = '';
        this.fechaEntregaMin = '';
        this.fechaEntregaMax = '';
      }
    });
  }

  formatearFechaEntrega(fecha: string): { label: string, datetime: string } {
    const date = new Date(fecha);
      return {
      label: date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
      }).toLowerCase(),
      datetime: date.toISOString().split('T')[0]
    };
  }

  private loadLoading() {
    this.subscriptionService.setShowSubscriptionSection(false);
    this.subscriptions = this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  private verifyAuthenticatedUser(): void {
     this._authEcommerce._authService.user.pipe(take(1)).subscribe(user => {
       if (user) {
         this.CURRENT_USER_AUTHENTICATED = user;
         this.CURRENT_USER_GUEST = null;
         this.checkIfAddressClientExists();
       } else {
         this._authEcommerce._authService.userGuest.pipe(take(1)).subscribe(guestUser => {
            if (guestUser && guestUser.state === 1) {
              // ⚠️ Modo invitado detectado → forzar login
              this.CURRENT_USER_AUTHENTICATED = null;
              this.CURRENT_USER_GUEST = guestUser;
              this.checkIfAddressGuestExists();
            } else {
              // ❌ Ningún usuario válido → también forzar login
              this.CURRENT_USER_AUTHENTICATED = null;
              this.CURRENT_USER_GUEST = null;
            }
         });
       }
     });
  }

  checkIfAddressClientExists() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this._authEcommerce.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
        (resp: any) => {
          this.listAddressClients = resp.address_client;
          // ✅ Restaurar dirección seleccionada para autenticado
          this.restoreSelectedAddress(this.listAddressClients, 'selectedAddressId');
      });
    }
  }

  checkIfAddressGuestExists() {
    const currentUrl = this._router.url;
    if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listAddressGuest().subscribe(
        (resp: any) => {
          this.listAddressGuest = resp.addresses;
          // ✅ Restaurar dirección seleccionada para invitado
          this.restoreSelectedAddress(this.listAddressGuest, 'selectedGuestAddressId');
      });
    }
  }

  restoreSelectedAddress(list: any[], storageKey: string) {
    // 1. Buscar dirección habitual en db
    const habitual = list.find(addr => addr.usual_shipping_address === true);
    if (habitual) {
      this.selectedAddressId = habitual.id;
      this.selectedAddress = habitual;
      if (this.selectedAddress) {
        this.generateShippingRate(this.selectedAddress);
      }
      return;
    }

    // 2. Si no hay habitual, buscar en sessionStorage
    const savedAddressId = sessionStorage.getItem(storageKey);
    if (savedAddressId) {
      const parsedId = parseInt(savedAddressId, 10);
      const found = list.find(addr => addr.id === parsedId);
      if (found) {
        this.selectedAddressId = parsedId;
        this.selectedAddress = found;
        return;
      }
    }
    
     // 3. Fallback: usar la primera del array
    if (list.length > 0) {
      this.selectedAddressId = list[0].id;
      this.selectedAddress = list[0];
      if (this.selectedAddress) {
        this.generateShippingRate(this.selectedAddress);
      }
    }
  }

  generateShippingRate(selectedAddress: Address | null = null) {
    // Generar items para envío
    const items = this.listCarts.map((item: any) => ({
      variant_id: item.variedad.variant_id,
      quantity: item.cantidad
    }));

    // si ya tienes la dirección cargada
    if ( selectedAddress ) { 
      // Llamar a loadShippingRateWithAddress con dirección y los items
      this.loadShippingRateWithAddress(selectedAddress, items);
    }
  }

  private currentDataCart() {
    this.subscriptions.add(
      this._cartService.currenteDataCart$.subscribe((resp:any) => {
        this.listCarts = resp;
        //console.log("Get list Carts resumen: ", this.listCarts);
        
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => {
          // Usar el precio final procesado con descuentos si existe, si no calcular 
          const finalPrice = item.finalUnitPrice || this.getFinalUnitPrice(item);
          return sum + (finalPrice * item.cantidad);
        }, 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      })
    );
  }

  /**
 * Obtiene la imagen correcta de la variedad (preview > default) o fallback al producto
 */
getVarietyImage(cart: any): string {
    if (!cart.variedad?.files) return cart.product.imagen;

    // Buscamos primero la imagen tipo 'preview'
    const preview = cart.variedad.files.find((f: any) => f.type === 'preview');
    if (preview && preview.preview_url) return preview.preview_url;

    // Luego buscamos 'default'
    const def = cart.variedad.files.find((f: any) => f.type === 'default');
    if (def && def.preview_url) return def.preview_url;

    // Fallback al producto base
    return cart.product.imagen;
  }

  
  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.locale, this.country, 'shop', 'home']);
  }
  
  goToNextStep() {
    // Validar que haya dirección seleccionada
    if (!this.selectedAddress) {
      alertWarning('Por favor, selecciona una dirección de envío antes de continuar.');
      return;
    }

    // Validar que se haya calculado el envío correctamente
    if (this.shippingRate === 0 && !this.shippingMethod) {
      alertWarning('No se pudo calcular el envío para la dirección seleccionada. Por favor, verifica que la dirección sea correcta o selecciona otra.');
      return;
    }

    // Validar que haya productos en el carrito
    if (!this.listCarts || this.listCarts.length === 0) {
      alertWarning('Tu carrito está vacío. Añade productos antes de continuar.');
      return;
    }

    // Todo OK, continuar al pago
    this.checkoutService.setNavigatingToPayment(true);
    this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'payment'], { queryParams: { initialized: true, from: 'step3' } });
  }

  getFormattedPrice(price: any) {
    if (typeof price === 'string') {
      price = parseFloat(price); // Convertir a número
    }
  
    if (isNaN(price)) {
      return { integerPart: "0", decimalPart: "00" }; // Manejo de error si el valor no es válido
    }
    
    const formatted = price.toFixed(2).split('.'); // Asegura siempre dos decimales
    return {
      integerPart: formatted[0], // Parte entera
      decimalPart: formatted[1]  // Parte decimal
    };
  }

  private listCartsLocalStorage(): void {
    this._cartService.listCartsCache('guest').subscribe((resp: any) => { //this._cartService.listCartsCache(this.CURRENT_USER_GUEST.user_guest).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => {
        this._cartService.changeCart(cart);
      });
    });
  }

  storeAllCarts() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this.listCartsDatabase();
    } else if (this.CURRENT_USER_GUEST) {
      this.listCartsLocalStorage();
    }
  }

  private listCartsDatabase(): void {
    this._cartService.resetCart();
    if ( this._cartService._authService.user ) {
      this._cartService.listCarts(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
        (resp:any) => {
          resp.carts.forEach((cart:any) => {
            this._cartService.changeCart(cart);
          });
      });
    }
  }

  onCheckboxChange(event: any) {
    this.isAddressSameAsShipping = event.target.checked;
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  removeAllCart(user_id: any) {
    this._cartService.deleteAllCart(user_id).subscribe(
      (resp: any) => {
        this._cartService.resetCart();
    }, (error) => {
        console.error("Error al eliminar el carrito:", error);
    });
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe(
      (resp:any) => {
        this._cartService.removeItemCart(cart);
    });
  }

  /**apllyCupon() {
    let data = {
      code: this.code_cupon, 
      user_id: this.CURRENT_USER_AUTHENTICATED._id
    }

    this._cartService.apllyCupon(data).subscribe(
      (resp:any) => {
        if (resp.message == 403) {
          alertDanger(resp.message_text);
        } else {
          alertSuccess(resp.message_text);
          this.storeAllCarts();//this.listAllCarts();
        }
    });
  }*/

  storeAddress() {
    // Decidir si es actualización o registro basado en el modo de edición
    if (this.isEditMode && this.editingAddressId) {
      this.storeUpdateAddress();
    } else {
      this.registerAddress();
    }
  }

  private registerAddress() {
    // Validación de campos obligatorios y usuario
    if ((!this.CURRENT_USER_AUTHENTICATED && !this.CURRENT_USER_GUEST) ||
        !this.name || !this.surname || !this.pais ||
        !this.calle || !this.numero || !this.zipcode || !this.poblacion ||
        !this.ciudad || !this.email || !this.phone) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Rellene los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      alertDanger("Rellene los campos obligatorios de la dirección de envío");
      return;
    }

    // Construir la dirección completa combinando calle + número + apartamento
    this.address = this.calle.trim() + ' ' + this.numero.trim();
    if (this.apartamento && this.apartamento.trim()) {
      this.address += ', ' + this.apartamento.trim();
    }

    // Marcar como validando
    this.isValidating = true;
    this.validationMessage = 'Validando código postal y ciudad...';

    // Construir objeto de dirección para validación
    const addressData = {
      name: this.name,
      surname: this.surname,
      pais: this.pais,
      address: this.address,
      zipcode: this.zipcode,
      poblacion: this.poblacion,
      ciudad: this.ciudad,
      email: this.email,
      phone: this.phone
    };

    // 🔍 PASO 1: VALIDAR CON BACKEND API (validación local con base de datos postal_codes)
    console.log('🔍 [ResumenCheckout] Paso 1: Validando código postal con backend API...');
    
    this.addressValidationService.validateLocalRulesAsync(addressData).subscribe({
      next: (localValidation) => {
        if (!localValidation.isValid) {
          // ❌ Validación local falló (CP o ciudad no válidos según BD)
          console.log('❌ [ResumenCheckout] Validación de backend falló:', localValidation.message);
          this.isValidating = false;
          this.status = false;
          this.validMessage = true;
          this.errorOrSuccessMessage = localValidation.message;
          this.validationMessage = '';
          this.hideMessageAfterDelay();
          alertDanger(localValidation.message);
          return;
        }
        
        // ✅ Validación local correcta, ahora validar con Printful
        console.log('✅ [ResumenCheckout] Validación backend OK, validando con Printful...');
        this.validationMessage = 'Validando dirección con Printful...';
        
        // 🔍 PASO 2: VALIDAR CON PRINTFUL
        this.addressValidationService.validateWithPrintful(addressData).subscribe({
          next: (validation) => {
            this.isValidating = false;
            
            if (!validation.isValid) {
              // ❌ Dirección no válida según Printful
              this.status = false;
              this.validMessage = true;
              this.errorOrSuccessMessage = validation.message;
              this.validationMessage = '';
              this.hideMessageAfterDelay();
              alertDanger(validation.message);
              return;
            }

            // ✅ Dirección válida, proceder a guardar
            console.log('✅ [ResumenCheckout] Validación Printful OK, guardando...');
            this.validationMessage = 'Dirección válida, guardando...';
            this.saveValidatedAddress(addressData);
          },
          error: (err) => {
            console.error('❌ Error validando dirección con Printful:', err);
            this.isValidating = false;
            this.status = false;
            this.validMessage = true;
            this.errorOrSuccessMessage = "Error al validar la dirección con Printful";
            this.validationMessage = '';
            this.hideMessageAfterDelay();
            alertDanger("Error al validar la dirección");
          }
        });
      },
      error: (err) => {
        console.error('❌ Error validando con backend:', err);
        this.isValidating = false;
        this.status = false;
        this.validMessage = true;
        this.errorOrSuccessMessage = "Error al validar el código postal y ciudad";
        this.validationMessage = '';
        this.hideMessageAfterDelay();
        alertDanger("Error al validar el código postal y ciudad");
      }
    });
  }

  /**
   * Guarda la dirección validada en la base de datos
   */
  private saveValidatedAddress(addressData: any) {
    // Construir payload con usuario
    const payload: any = {
      ...addressData,
      usual_shipping_address: this.usual_shipping_address
    };
    
    // Seleccionar petición según tipo de usuario
    let request$;
    if (this.CURRENT_USER_AUTHENTICATED) {
      payload.user = this.CURRENT_USER_AUTHENTICATED._id;
      request$ = this._authEcommerce.registerAddressClient(payload);
    } else {
      payload.guest = this.CURRENT_USER_GUEST.id;
      request$ = this._authEcommerce.registerAddressGuest(payload);
    }

    // Ejecutar petición y manejar respuesta
    request$.subscribe((resp: any) => {
      this.validationMessage = '';
      if (resp.status === 200) {
        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();
        alertSuccess(resp.message);
        this.resetForm();
        
        // Cerrar formulario y volver a mostrar lista
        this.showAddressForm = false;
        this.isEditMode = false;
        this.editingAddressId = null;
        
        // Recargar direcciones para mostrar la lista actualizada
        this.loadAddresses();
      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al guardar la dirección";
        this.hideMessageAfterDelay();
      }
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al guardar la dirección";
      this.hideMessageAfterDelay();
    });
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
    this.calle = '';
    this.numero = '';
    this.apartamento = '';
    this.address = '';
    this.zipcode = '';
    this.poblacion = '';
    this.ciudad = '';
    this.email = '';
    this.phone = '';
    this.usual_shipping_address = false;
    
    // Limpiar estados de edición
    this.address_client_selected = null;
    this.availableCities = [];
    this.postalCodeError = '';
    this.cityError = '';
  }

  newAddress() {
    this.show = true;
    this.resetForm();
    this.address_client_selected = null;
  }

  /**
   * Activa el formulario principal para registrar nueva dirección
   */
  showNewAddressForm() {
    this.showAddressForm = true;
    this.isEditMode = false;
    this.editingAddressId = null;
    this.resetForm();
    
    // Scroll al formulario
    setTimeout(() => {
      const formElement = document.querySelector('#addressFormContainer');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  /**
   * Cancela la edición/registro y vuelve a mostrar la lista
   */
  cancelAddressForm() {
    this.showAddressForm = false;
    this.isEditMode = false;
    this.editingAddressId = null;
    this.resetForm();
  }

  /**
   * Carga los datos de una dirección en el formulario principal (para edición)
   */
  loadAddressDataToForm(address: any) {
    this.address_client_selected = address;
    this.name = address.name;
    this.surname = address.surname;
    this.pais = address.pais;
    
    // Manejar campos separados o dirección completa
    if (address.calle) {
      this.calle = address.calle;
      this.numero = address.numero || '';
      this.apartamento = address.apartamento || '';
    } else {
      // Backward compatibility: extraer de address completa
      const fullAddress = address.address || '';
      const parts = fullAddress.split(',').map((p: string) => p.trim());
      
      if (parts.length > 0) {
        const calleYNumero = parts[0];
        const match = calleYNumero.match(/^(.+?)\s+(\d+[A-Za-z]?)\s*$/);
        
        if (match) {
          this.calle = match[1].trim();
          this.numero = match[2].trim();
        } else {
          this.calle = calleYNumero;
          this.numero = '';
        }
        
        this.apartamento = parts.length > 1 ? parts[1] : '';
      }
    }
    
    this.ciudad = address.ciudad;
    this.phone = address.telefono || address.phone;
    this.email = address.email;
    this.zipcode = address.zipcode;
    this.poblacion = address.poblacion;
    this.usual_shipping_address = address.usual_shipping_address;
  }

  addressClienteSelected(list_address:any) {
    this.show = true;
    this.address_client_selected = list_address;
    this.name = this.address_client_selected.name;
    this.surname = this.address_client_selected.surname;
    this.pais = this.address_client_selected.pais;
    
    // Si la dirección tiene campos separados, usarlos
    if (this.address_client_selected.calle) {
      this.calle = this.address_client_selected.calle;
      this.numero = this.address_client_selected.numero || '';
      this.apartamento = this.address_client_selected.apartamento || '';
    } else {
      // Si solo tiene address, intentar extraer calle, número y apartamento (backward compatibility)
      const fullAddress = this.address_client_selected.address || '';
      
      // Intentar separar por coma (formato: "Calle 123, 3º B")
      const parts = fullAddress.split(',').map((p: string) => p.trim());
      
      if (parts.length > 0) {
        // Primera parte es calle + número
        const calleYNumero = parts[0];
        // Buscar el último número en la primera parte
        const match = calleYNumero.match(/^(.+?)\s+(\d+[A-Za-z]?)\s*$/);
        
        if (match) {
          this.calle = match[1].trim();
          this.numero = match[2].trim();
        } else {
          // No se pudo separar, poner todo en calle
          this.calle = calleYNumero;
          this.numero = '';
        }
        
        // Segunda parte es apartamento (si existe)
        this.apartamento = parts.length > 1 ? parts[1] : '';
      } else {
        this.calle = fullAddress;
        this.numero = '';
        this.apartamento = '';
      }
    }
    
    this.ciudad = this.address_client_selected.ciudad;
    this.phone = this.address_client_selected.telefono || this.address_client_selected.phone;
    this.email = this.address_client_selected.email;
    this.zipcode = this.address_client_selected.zipcode;
    this.poblacion = this.address_client_selected.poblacion;
    this.usual_shipping_address = this.address_client_selected.usual_shipping_address;
  }

  onAddressChange(selectedId: string) {
    const selectedAddress = this.listAddresses.find(address => address.id == selectedId);
  
    if (selectedAddress) {
      this.selectedAddressId = selectedAddress.id;
      this.addressClienteSelected(selectedAddress);
    } else {
      console.error('ID de dirección no encontrado:', selectedId);
    }
  }
  
  get listAddresses(): any[] {
    return this.CURRENT_USER_AUTHENTICATED ? this.listAddressClients : this.listAddressGuest;
  }

  confirmarDireccion() {
    if (!this.selectedAddressId) {
      console.warn('No hay dirección seleccionada');
      return;
    }

    const selected = this.listAddresses.find(addr => addr.id === this.selectedAddressId);
    if (!selected) return;

    // 1) Guarda en el servicio de checkout
    this.checkoutService.setSelectedAddress(selected);
    this.selectedAddress = selected;

    // 2) Guardar en sessionStorage según tipo de usuario
    let storageKey = '';
    if (this.CURRENT_USER_AUTHENTICATED) {
      storageKey = 'selectedAddressId';
    } else if (this.CURRENT_USER_GUEST) {
      storageKey = 'selectedGuestAddressId';
    }
    sessionStorage.setItem(storageKey, this.selectedAddressId.toString());

    // 3) Si es usuario autenticado → actualizar dirección habitual
    if (this.CURRENT_USER_AUTHENTICATED) {
      const userId = this.CURRENT_USER_AUTHENTICATED._id;
      this._authEcommerce.setAsUserAuthenticatedUsualShippingAddress(this.selectedAddressId, userId).subscribe({
        next: (res:any) => {
          if (res.status == 200) {
              alertSuccess(res.message)
              this.loadAddresses();
          }
      },
        error: (err) => console.error("Error al actualizar dirección habitual", err)
      });
    } else if (this.CURRENT_USER_GUEST) {
      // 🚀 Aquí decides qué hacer en modo invitado:
      // - Guardar la dirección en backend asociada al guest.id
      // - O solo mantenerla en sessionStorage

      const guestId = this.CURRENT_USER_GUEST.id;
      this._authEcommerce.setGuestUsualShippingAddress(this.selectedAddressId, guestId).subscribe({
        next: (res:any) => {
          if (res.status == 200) {
            alertSuccess(res.message)
            this.loadAddresses();
          }
      },
        error: (err) => console.error("Error al actualizar dirección invitado", err)
      });
    }

    this.closeMiniAdress();
  }

  loadAddresses() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this.checkIfAddressClientExists();
    } else if (this.CURRENT_USER_GUEST) {
      this.checkIfAddressGuestExists();
    }
  }

  goToRegisterAddress() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this._router.navigate(['/', this.country, this.locale, 'account', 'myaddresses', 'add'], {
        queryParams: { returnUrl: `/${this.country}/${this.locale}/account/checkout` }
      });
    } else if (this.CURRENT_USER_GUEST) {
      this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'delivery'], {
        queryParams: { 
          returnUrl: `/${this.locale}/${this.country}/account/checkout/resumen?initialized=true&from=step2` 
        }
      });
    }
  }

  closeMiniAdress(): void {
    this.minicartService.closeMiniAddress();
  }

  openAddressModal() {
    if (!this.selectedAddressId && this.listAddresses.length > 0) {
      this.selectedAddressId = this.listAddresses[0].id;
    }
    // Abrir sidebar con la lista de direcciones
    this.minicartService.openMiniAddress();
  }
  
  editAddressFromSidebar(address: any) {
    // 1. Cerrar sidebar
    this.minicartService.closeMiniAddress();
    
    // 2. Activar modo edición
    this.isEditMode = true;
    this.showAddressForm = true;
    this.editingAddressId = address.id;
    
    // 3. Cargar datos de la dirección en el formulario principal
    this.loadAddressDataToForm(address);
    
    // 4. Scroll al formulario para mejor UX
    setTimeout(() => {
      const formElement = document.querySelector('#addressFormContainer');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  
  removeAddressSelected(list_address:any) {
    this._authEcommerce.deleteAddressClient(list_address.id).subscribe((resp:any) => {      
      let INDEX = this.listAddressClients.findIndex((item:any) => item.id == list_address.id);
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
    this._router.navigate(['/', this.locale, this.country, 'account', 'myaddresses', 'add'],{ queryParams: { email } });
  }

  public login() {
    if (!this.email_identify) {
      alertDanger("Es necesario ingresar el email");
    }

    if (!this.password_identify) {
      alertDanger("Es necesario ingresar el password");
    }

    const subscriptionLogin =  this._authService.login(this.email_identify, this.password_identify).subscribe(
      (resp:any) => {
        if (!resp.error && resp) {
          this._router.navigate(['/', this.locale, this.country, 'account', 'checkout'])
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

  /* --------------- EMPIEZA EL CICLO DE ACTUALIZACION DE DIRECCIONES TANTO PARA USUARIOS REGISTRADOS O USUARIO INVITADO -------------- */
  /**
   * Actualiza la dirección del usuario en el sistema.
   * Este método se encarga de gestionar la actualización de direcciones 
   * tanto para usuarios registrados como para usuarios invitados.
   *
   * - Llama al servicio correspondiente (`updateAddressClient` o `updateAddressGuest`).
   * - Verifica el estado de la respuesta (`200`, `404`, `500`).
   * - Si la actualización es exitosa, reemplaza la dirección en la lista.
   * - Muestra mensajes de éxito o error según corresponda.
   * - Cierra el modal después de la operación.
   *
   * TODO: Refactorizar este proceso para evitar duplicación de código,
   * creando un método genérico que reciba el tipo de usuario y maneje la actualización.
   */
  private storeUpdateAddress() {
    if (!this.name || !this.surname || !this.pais || !this.calle || !this.numero || !this.zipcode || !this.poblacion || !this.ciudad || !this.email || !this.phone) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, rellene los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      alertDanger("Rellene los campos obligatorios de la dirección de envío");
      return;
    }

    // Construir la dirección completa combinando calle + número + apartamento
    this.address = this.calle.trim() + ' ' + this.numero.trim();
    if (this.apartamento && this.apartamento.trim()) {
      this.address += ', ' + this.apartamento.trim();
    }

    // Marcar como validando
    this.isValidating = true;
    this.validationMessage = 'Validando código postal y ciudad...';

    // Construir objeto de dirección para validación
    const addressData = {
      name: this.name,
      surname: this.surname,
      pais: this.pais,
      address: this.address,
      zipcode: this.zipcode,
      poblacion: this.poblacion,
      ciudad: this.ciudad,
      email: this.email,
      phone: this.phone
    };

    // 🔍 PASO 1: VALIDAR CON BACKEND API (validación local con base de datos postal_codes)
    console.log('🔍 [ResumenCheckout-Update] Paso 1: Validando código postal con backend API...');
    
    this.addressValidationService.validateLocalRulesAsync(addressData).subscribe({
      next: (localValidation) => {
        if (!localValidation.isValid) {
          // ❌ Validación local falló (CP o ciudad no válidos según BD)
          console.log('❌ [ResumenCheckout-Update] Validación de backend falló:', localValidation.message);
          this.isValidating = false;
          this.status = false;
          this.validMessage = true;
          this.errorOrSuccessMessage = localValidation.message;
          this.validationMessage = '';
          this.hideMessageAfterDelay();
          alertDanger(localValidation.message);
          return;
        }
        
        // ✅ Validación local correcta, ahora validar con Printful
        console.log('✅ [ResumenCheckout-Update] Validación backend OK, validando con Printful...');
        this.validationMessage = 'Validando dirección con Printful...';
        
        // 🔍 PASO 2: VALIDAR CON PRINTFUL
        this.addressValidationService.validateWithPrintful(addressData).subscribe({
          next: (validation) => {
            this.isValidating = false;
            
            if (!validation.isValid) {
              // ❌ Dirección no válida según Printful
              this.status = false;
              this.validMessage = true;
              this.errorOrSuccessMessage = validation.message;
              this.validationMessage = '';
              this.hideMessageAfterDelay();
              alertDanger(validation.message);
              return;
            }

            // ✅ Dirección válida, proceder a actualizar
            console.log('✅ [ResumenCheckout-Update] Validación Printful OK, actualizando...');
            this.validationMessage = 'Dirección válida, actualizando...';
            this.proceedWithUpdate();
          },
          error: (err) => {
            console.error('❌ Error validando dirección con Printful:', err);
            this.isValidating = false;
            this.status = false;
            this.validMessage = true;
            this.errorOrSuccessMessage = "Error al validar la dirección con Printful";
            this.validationMessage = '';
            this.hideMessageAfterDelay();
            alertDanger("Error al validar la dirección");
          }
        });
      },
      error: (err) => {
        console.error('❌ Error validando con backend:', err);
        this.isValidating = false;
        this.status = false;
        this.validMessage = true;
        this.errorOrSuccessMessage = "Error al validar el código postal y ciudad";
        this.validationMessage = '';
        this.hideMessageAfterDelay();
        alertDanger("Error al validar el código postal y ciudad");
      }
    });
  }

  private proceedWithUpdate() {
    // Usar editingAddressId en lugar de address_client_selected.id
    const addressId = this.editingAddressId || this.address_client_selected?.id;
    
    let data = {
      _id       : addressId,
      user      : this.CURRENT_USER_AUTHENTICATED ? this.CURRENT_USER_AUTHENTICATED._id : this.CURRENT_USER_GUEST,
      name      : this.name,
      surname   : this.surname,
      pais      : this.pais,
      address   : this.address,
      zipcode   : this.zipcode,
      poblacion : this.poblacion,
      ciudad    : this.ciudad,
      email     : this.email,
      phone     : this.phone,
      usual_shipping_address: this.usual_shipping_address,
    };
      
    // VERIFICAR SI SE ESTÁ MODIFICANDO EN USUARIO REGISTRADO O INVITADO
    this.CURRENT_USER_AUTHENTICATED ? this.updateAddressClient(data) : this.updateAddressGuest(data);
  }
  
  private updateAddressClient(data: any) {
    this._authEcommerce.updateAddressClient(data).subscribe(
      (resp: any) => this.handleAddressUpdateResponse(resp, 'client'),
      (error) => this.handleAddressUpdateError(error)
    );
  }
  
  private updateAddressGuest(data: any) {
    this._authEcommerce.updateAddressGuest(data).subscribe(
      (resp: any) => this.handleAddressUpdateResponse(resp, 'guest'),
      (error) => this.handleAddressUpdateError(error)
    );
  }

  private handleAddressUpdateResponse(resp: any, type: 'client' | 'guest') {
    const { status, address_client, message } = resp;
    
    switch (status) {
      case 200:
        this.updateAddressList(address_client, type);
        this.showAlert(message, 'success');
        break;
      case 404:
        this.showAlert(message, 'warning');
        break;
      case 500:
        this.showAlert(message, 'danger');
        break;
      default:
        this.showAlert('Error desconocido', 'danger');
        break;
    }
    this.closeModal();
  }

  private updateAddressList(addressClient: any, type: 'client' | 'guest'): void {
    const list = type === 'client' ? this.listAddressClients : this.listAddressGuest;
    const index = list.findIndex((item: any) => item.id === this.address_client_selected.id);
    
    if (index !== -1) {
      list[index] = addressClient;
    }
    
    // Recargar direcciones para actualizar selectedAddress y la vista
    this.loadAddresses();
    
    // Si la dirección editada es la actualmente seleccionada, actualizarla
    if (this.selectedAddress && this.selectedAddress.id === addressClient.id) {
      this.selectedAddress = addressClient;
      this.cdr.detectChanges(); // Forzar detección de cambios
    }
    
    this.hideMessageAfterDelay();
    this.resetForm();
  }

  private handleAddressUpdateError(error: any): void {
    this.showAlert("¡Oops! No se pudo actualizar la dirección", 'danger');
    this.closeModal();
  }

  private showAlert(message: string, type: 'success' | 'warning' | 'danger'): void {
    switch (type) {
      case 'success':
        alertSuccess(message);
        break;
      case 'warning':
        alertWarning(message);
        break;
      case 'danger':
        alertDanger(message);
        break;
    }
  }
  
  private closeModal(): void {
    // Cerrar formulario en lugar del modal
    this.showAddressForm = false;
    this.isEditMode = false;
    this.editingAddressId = null;
  }
  /* -------------------------------------------------------- FIN ACTUALIZACION DE DIRECCIONES --------------------------------------------------- */

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    // Ajusta el tamaño de la imagen según el tipo de dispositivo
    if (this.isMobile) {
        this.width = 80;  // tamaño para móviles
        this.height = 80; // tamaño para móviles
    } else {
        this.width = 100; // tamaño por defecto
        this.height = 100; // tamaño por defecto
    }
  }

  /**
   * Obtiene el precio unitario final (con descuento si aplica)
   */
  getFinalUnitPrice(cart: any): number {
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);

    // Si no hay descuento aplicado, retornar precio original
    if (!cart.type_discount || !cart.discount) {
      
      return originalPrice;
    }

    const discountValue = parseFloat(cart.discount);
    
    // Verificar que el descuento sea válido
    if (isNaN(discountValue) || discountValue <= 0) {
      return originalPrice;
    }

    let priceAfterDiscount: number;
    
    if (cart.type_discount === 1) { 
      // Descuento porcentual
      if (cart.code_cupon) {
        // CUPONES REALES - aplicar redondeo .95
        
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        
        const finalWithRounding = this.priceCalculationService.formatPrice(priceAfterDiscount);
        
        return finalWithRounding;
      } else if (cart.code_discount && !cart.code_cupon) {
        // FLASH SALE con descuento porcentual - usar el descuento como porcentaje
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        return this.priceCalculationService.formatPrice(priceAfterDiscount);
      } else {
        // CAMPAIGN DISCOUNTS - cart.discount contiene el PRECIO FINAL, no el porcentaje
        if (discountValue > 0 && discountValue < originalPrice) {
          // Si discount parece ser un precio final válido, usar formato estándar
          return this.priceCalculationService.formatPrice(discountValue);
        } else {
          // Si no, tratar como porcentaje (fallback) y aplicar .95 rounding
          if (discountValue > 100) return originalPrice;
          priceAfterDiscount = originalPrice * (1 - discountValue / 100);
          priceAfterDiscount = Math.max(0, priceAfterDiscount);
          return this.priceCalculationService.formatPrice(priceAfterDiscount);
        }
      }
    } else if (cart.type_discount === 2) {
      // Descuento de monto fijo - Formato estándar
      priceAfterDiscount = Math.max(0, originalPrice - discountValue);
      return this.priceCalculationService.formatPrice(priceAfterDiscount);
    } else {
      // Tipo de descuento no reconocido
      return originalPrice;
    }
  }

  /**
   * Verifica si un item específico del carrito tiene descuento aplicado
   */
  hasCartItemDiscount(cart: any): boolean {
    // Verificar si existe descuento
    if (!cart.type_discount || !cart.discount) {
      return false;
    }
    
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
    const finalPrice = this.getFinalUnitPrice(cart);
    
    // Verificar si el precio final es menor al original (hay descuento real)
    return finalPrice < originalPrice && finalPrice > 0;
  }

  /**
   * Verifica si hay algún producto en el carrito con descuento (para usar en template)
   */
  hasAnyCartDiscount(): boolean {
    return this.listCarts.some((cart: any) => {
      return cart.finalUnitPrice && this.getFinalUnitPrice(cart) < (cart.variedad?.retail_price || cart.price_unitario);
    });
  }

  /**
   * Calcula el subtotal original (sin descuentos) - suma de todos los precios originales * cantidad
   */
  getOriginalSubtotal(): number {
    return this.listCarts.reduce((total: number, cart: any) => {
      const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
      return total + (originalPrice * (cart.cantidad || 1));
    }, 0);
  }

  /**
   * Calcula el subtotal con precios finales (después de descuentos)
   */
  getSubtotal(): number {
    return this.listCarts.reduce((total: number, cart: any) => {
      const finalPrice = this.getFinalUnitPrice(cart);
      return total + (finalPrice * (cart.cantidad || 1));
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

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.checkDeviceType(); // Verifica el tamaño de la pantalla
  } 
}
