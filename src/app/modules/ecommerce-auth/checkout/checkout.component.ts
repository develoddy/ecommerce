import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { filter, Subject, Subscription, take, takeUntil } from 'rxjs';
import { CheckoutService } from '../_services/checkoutService';
import { LocalizationService } from 'src/app/services/localization.service';
import { PriceCalculationService } from '../../home/_services/product/price-calculation.service';
import { LoaderService } from '../../home/_services/product/loader.service';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';

declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, AfterViewInit {

  @ViewChild('paypal',{static: true}) paypalElement?: ElementRef;
  euro = "€";
  listAddressClients:any = [];
  listAddressGuest:any = [];
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
  address_client_selected:any = null;
  listCarts:any = [];
  totalCarts:any=null;
  show = false;
  user:any;
  code_cupon:any=null;
  sale: any;
  saleDetails: any =[];
  isSaleSuccess = false;
  PAYMENT:boolean=false;
  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd : boolean = false;
  url: string = "";
  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  password_identify:string = "";
  email_identify:string = "";
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;
  private subscriptions: Subscription = new Subscription();
  isPasswordVisible: boolean = false;
  locale: string = "";
  country: string = "";
  currentStep: string = '';  // Paso actual de checkout
  isCheckoutNavVisible: boolean = true; // Inicializa en true para mostrar el Nav step de manera predeterminada
  shouldCleanGuest: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    public _authEcommerce: EcommerceAuthService,
    public _authService: AuthService,
    public _cartService: CartService,
    public _router: Router,
    private subscriptionService: SubscriptionService,
    public routerActived: ActivatedRoute,
    private cdRef: ChangeDetectorRef,
    public loader: LoaderService,
    private checkoutService: CheckoutService,
    private localizationService: LocalizationService,
    private priceCalculationService: PriceCalculationService,
    private dynamicRouter: DynamicRouterService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
    this.routerActived.params.subscribe((data: any) => {
      this.currentStep = data.step;
    });
  }

  ngAfterViewInit() {}

  ngOnInit(): void {
  this.loadLoading();

    this.checkoutService.isSaleSuccess$.subscribe((success: boolean) => {
      if (success) {
        this.currentStep = 'successfull';
      }
    });

    this.subscribeToLocalization();
    this.subscribeToCheckoutEvents();
    this.loadCurrentDataCart();
    this.verifyAuthenticatedUser();
    this.initializeExternalScripts();
    this.watchRouteChanges();
    this.updateCurrentStep();
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

  private initializeExternalScripts(): void {
    this.loadLoading();
    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 150);
  }

  private watchRouteChanges(): void {
    // DETECTAR EN QUE PASO ESTÁ EL USUARIO (COMPONENTE HIJO ACTIVO)
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCurrentStep();
    });
  }

  private subscribeToCheckoutEvents(): void {
    this.checkoutService.navigatingToPayment$
    .pipe(takeUntil(this.destroy$))
    .subscribe(value => {
      if (value) {
        // -- ESCUCHANDO NAVIGATE TO PAYMENT
        this.currentStep = 'payment';
      }
    });

    this.checkoutService.isSaleSuccess$
    .pipe(takeUntil(this.destroy$))
    .subscribe(value => {
      if (value) {
        this.currentStep = 'successfull'; 
      }
    });
  }

  loadLoading() {
    this.subscriptions.add(
      this.loader.loading$.subscribe((isLoading) => {
        if (!isLoading) {
          setTimeout(() => {
            HOMEINITTEMPLATE($);
          }, 150);
        } else {
          cleanupHOMEINITTEMPLATE($);
        }
      })
    );
  }

  loadCurrentDataCart() {
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      
      // Procesar precios con descuentos antes de calcular totales
      this.processCartPrices();
      
      // Calcular total usando los precios finales procesados
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => {
        const finalPrice = item.finalUnitPrice || this.getFinalUnitPrice(item);
        return sum + (finalPrice * item.cantidad);
      }, 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      
    });
  }

  /**
   * Procesa los precios del carrito aplicando descuentos
   */
  private processCartPrices(): void {
    this.listCarts.forEach((cart: any) => {
      // Calcular el precio final unitario
      cart.finalUnitPrice = this.getFinalUnitPrice(cart);
      
      // Calcular subtotal y total con precio final
      cart.finalSubtotal = cart.finalUnitPrice * cart.cantidad;
      cart.finalTotal = cart.finalSubtotal;
      
      // console.log(`💰 Procesando ${cart.product.title}:`, {
      //   precioOriginal: cart.price_unitario,
      //   precioFinal: cart.finalUnitPrice,
      //   tieneDescuento: this.hasCartItemDiscount(cart),
      //   cantidad: cart.cantidad,
      //   subtotalFinal: cart.finalSubtotal
      // });
    });
  }

  /**
   * Obtiene el precio unitario final (con descuento si aplica)
   */
  getFinalUnitPrice(cart: any): number {
    // Si hay descuento aplicado (type_discount y discount), usar el precio con descuento
    if (cart.type_discount && cart.discount) {
      return parseFloat(cart.discount);
    }
    
    // Si no hay descuento, usar precio de variedad o precio unitario
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  /**
   * Verifica si un item del carrito tiene descuento
   */
  hasCartItemDiscount(cart: any): boolean {
    if (!cart.type_discount || !cart.discount) return false;
    
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
    const discountedPrice = parseFloat(cart.discount);
    
    return discountedPrice < originalPrice;
  }

  /**
   * Obtiene el precio original antes del descuento
   */
  getOriginalUnitPrice(cart: any): number {
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  /**
   * Obtiene las partes del precio (entero y decimal) usando el servicio
   */
  getPriceParts(price: number) {
    if (!this.priceCalculationService) {
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
  }

  // DETECTA EN QUE COMPONENTE HIJO ESTÁ EL USUARIO AL ANALIZAR LA RUTA ACTIVA Y ACTUALIZAR LA PROPIEDAD CURRENTSTEP
  private updateCurrentStep(): void {
    const currentRoute = this.getActiveRoute(this.routerActived);
    if (currentRoute) {
      this.currentStep = currentRoute.snapshot.routeConfig?.path || '';
      // -- OCULTA EL NAV SI ESTÁ EN EL COMPONENTE LOGIN O DELIVERY
      if (this.currentStep === 'delivery' || this.currentStep === 'login') {
        this.isCheckoutNavVisible = false; // Ocultar el Nav step checkout
      } else {
        this.isCheckoutNavVisible = true; // Mostrar el Nav step checkout
      }
    }
  }
  
  private getActiveRoute(route: ActivatedRoute): ActivatedRoute {
    // -- RECURSIVAMENTE ACCEDE A LA RUTA HIJA MÁS PROFUNDA
    if (!route.firstChild) {
      return route;
    }
    return this.getActiveRoute(route.firstChild);
  }

  // -- VERIFICA EL ESTADO DEL CURRENT USER
  verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.pipe(take(1)).subscribe(user => {
      if (user) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.CURRENT_USER_GUEST = null;
        this.checkIfAddressClientExists();
      } else {
        this._authEcommerce._authService.userGuest.pipe(take(1)).subscribe(guestUser => {
          
           if (guestUser && guestUser.state === 1) {
            // ⚠️ Modo invitado detectado
            this.CURRENT_USER_AUTHENTICATED = null;
            this.CURRENT_USER_GUEST = guestUser;
            // No forzar login para invitados
           } else {
            // ❌ Ningún usuario válido
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
          if (this.listAddressClients.length === 0) {
            this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
          } else {
            if (this.currentStep === 'successfull') {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'successfull'], { queryParams: { initialized: true, from: 'step4' } });
              return;
            }
            if (this.currentStep === 'payment') {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'payment'], { queryParams: { initialized: true, from: 'step3' } });
            }
             else {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
            }
          }
      });
    }
  }

  checkIfAddressGuestExists() {
    const currentUrl = this._router.url;
    if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listAddressGuest().subscribe(
        (resp: any) => {
          this.listAddressGuest = resp.addresses;
          if (this.listAddressGuest.length === 0) {
            this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
          } else {
            if (this.currentStep === 'successfull') {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'successfull'], { queryParams: { initialized: true, from: 'step4' } });
              return;
            }
            if (this.currentStep === 'payment') {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'payment'], { queryParams: { initialized: true, from: 'step3' } });
            } else {
              this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
            }
          }
      });
    }
  }

  navigateToCart() {
    this.shouldCleanGuest = false;
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.country, this.locale, 'shop', 'cart']);
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

  apllyCupon() {
    let data = {code: this.code_cupon, user_id: this.CURRENT_USER_AUTHENTICATED._id}
    this._cartService.apllyCupon(data).subscribe(
      (resp:any) => {
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
    if ( this._cartService._authService.user ) {
      this._cartService.listCarts(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
        (resp:any) => {
          resp.carts.forEach((cart:any) => {
            this._cartService.changeCart(cart);
          });
      });
    }
  }

  store() {
    this.address_client_selected ? this.updateAddress(): this.registerAddress();
  }

  registerAddress() {
    if ( 
      !this.name      || 
      !this.surname   || 
      !this.pais      || 
      !this.address   || 
      !this.zipcode   || 
      !this.poblacion || 
      !this.ciudad    || 
      !this.email     || 
      !this.phone 
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Rellene los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      alertDanger("Rellene los campos obligatorios de la dirección de envío");
      return;
    }

    let data = {    
        user      : this.CURRENT_USER_AUTHENTICATED._id,
        name      : this.name,
        surname   : this.surname,
        pais      : this.pais,
        address   : this.address,
        zipcode   : this.zipcode,
        poblacion : this.poblacion,
        ciudad    : this.ciudad,
        email     : this.email,
        phone     : this.phone,
    };
    
    this._authEcommerce.registerAddressClient(data).subscribe(
      (resp:any) => {
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
          this.errorOrSuccessMessage = "Error al guardar la dirección";
          this.hideMessageAfterDelay();
        }
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al guardar la dirección";
      this.hideMessageAfterDelay();
    });
  }

  updateAddress() {
    if (!this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.email || !this.phone) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, rellene los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      return;
    }

    let data = {
      _id       : this.address_client_selected.id,
      user      : this.CURRENT_USER_AUTHENTICATED._id,
      name      : this.name,
      surname   : this.surname,
      pais      : this.pais,
      address   : this.address,
      zipcode   : this.zipcode,
      poblacion : this.poblacion,
      email     : this.email,
      phone     : this.phone,
    };

    this._authEcommerce.updateAddressClient( data ).subscribe((resp:any) => {
      if (resp.status == 200) {
        let INDEX = this.listAddressClients.findIndex((item:any) => item.id == this.address_client_selected.id);
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
        this.errorOrSuccessMessage = "Error al actualizar la dirección.";
        this.hideMessageAfterDelay();
      }
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al actualizar la dirección.";
      this.hideMessageAfterDelay();
    });
  }

  hideMessageAfterDelay() {
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

  addressClienteSelected(list_address:any) {
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

  onAddressChange(event:any) {
    const selectedIndex = event.target.value;
    if (selectedIndex !== "") {
      const selectedAddress = this.listAddressClients[selectedIndex];
      this.addressClienteSelected(selectedAddress);
    }
  }

  removeAddressSelected(list_address:any) {
    this._authEcommerce.deleteAddressClient(list_address.id).subscribe((resp:any) => {      
      let INDEX = this.listAddressClients.findIndex((item:any) => item.id == list_address.id);
      if (INDEX !== -1) { 
        this.listAddressClients.splice(INDEX, 1); // Elimina 1 elemento a partir del índice INDEX
      }
      alertSuccess(resp.message);
      this.resetForm();
    });
  }

  verifyExistEmail(email: string) {
    sessionStorage.setItem('returnUrl', this._router.url); // Guarda la URL actual en sessionStorage
    this.dynamicRouter.navigateWithLocale(['account', 'myaddresses', 'add'], { queryParams: { email } });
  }

  login() {
    if (!this.email_identify) {
      alertDanger("Es necesario ingresar el email");
    }

    if (!this.password_identify) {
      alertDanger("Es necesario ingresar el password");
    }

    const subscriptionLogin =  this._authService.login(this.email_identify, this.password_identify).subscribe(
      (resp:any) => {
        if (!resp.error && resp) {
          // Tras login en checkout padre, ir al paso de resumen sin recargar
          this._cartService.resetCart();
          this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'login' } });
         } else {
          this.errorAutenticate = true;
          this.errorMessageAutenticate = resp.error.message;
        }
      });
    this.subscriptions.add(subscriptionLogin);
  }

  showLogin(): void {
    this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'login']); // Redirige al componente de login
  }
     
  handleGuestCheckout() {
    // En resumen, cada vez que haya un cambio en los datos del carrito, este código redirige al usuario a 
    // una página de resumen de la compra, pasando ciertos parámetros para controlar el flujo de la aplicación.
    this._cartService.currenteDataCart$.subscribe(() => {
        this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { 
          queryParams: { 
            initialized: true, 
            from: 'step2' 
          }
        });
    });
  }

  /**
   * Permite navegar entre pasos del checkout
   */
  navigateToStep(step: string): void {
    if (step === 'resumen' && this.currentStep !== 'resumen') {
      this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { 
        queryParams: { initialized: true, from: 'stepper' }
      });
    } else if (step === 'payment' && this.currentStep === 'successfull') {
      this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'payment'], { 
        queryParams: { initialized: true, from: 'stepper' }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
