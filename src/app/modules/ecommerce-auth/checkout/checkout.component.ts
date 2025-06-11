import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { filter, Subject, Subscription, take, takeUntil } from 'rxjs';
import { CheckoutService } from '../_services/checkoutService';
import { LocalizationService } from 'src/app/services/localization.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
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
  public loading: boolean = false;
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
    private checkoutService: CheckoutService,
    private localizationService: LocalizationService
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

    this.subscribeToCheckoutEvents();
    this.loadCurrentDataCart();
    this.verifyAuthenticatedUser();
    this.initializeExternalScripts();
    this.watchRouteChanges();
    this.updateCurrentStep();
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
        this.currentStep = 'payment'; // -- O 3 SI LO MANEJAS COMO NÚMERO
      }
    });

    this.checkoutService.isSaleSuccess$
    .pipe(takeUntil(this.destroy$))
    .subscribe(value => {
      if (value) {
        this.currentStep = 'successfull'; // -- O 4 SI LO MANEJAS COMO NÚMERO
      }
    });
  }

  loadLoading() {
    this.subscriptionService.setShowSubscriptionSection(false);
    setTimeout(() => {
    this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = !isLoading;
    });
    }, 1500);
  }

  loadCurrentDataCart() {
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });
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
          if (guestUser?.guest) {
            this.CURRENT_USER_GUEST = guestUser;
            this.checkIfAddressGuestExists();
          } else {
            this.showLogin();
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
            this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
          } else {
            if (this.currentStep === 'payment') {
              this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'payment'], { queryParams: { initialized: true, from: 'step3' } });
            } else {
              this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
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
            this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
          } else {
            if (this.currentStep === 'payment') {
              this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'payment'], { queryParams: { initialized: true, from: 'step3' } });
            } else {
              this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
            }
          }
      });
    }
  }

  navigateToCart() {
    this.shouldCleanGuest = false;
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.locale, this.country, 'shop', 'cart']);
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
        console.log(resp.message_text);
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
    this._router.navigate(['/', this.locale, this.country, 'account', 'myaddresses', 'add'],{ queryParams: { email } });
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

  showLogin(): void {
    this._router.navigate(['/', this.locale, this.country, 'account', 'checkout', 'login']); // Redirige al componente de login
  }
     
  handleGuestCheckout() {
    // En resumen, cada vez que haya un cambio en los datos del carrito, este código redirige al usuario a 
    // una página de resumen de la compra, pasando ciertos parámetros para controlar el flujo de la aplicación.
    this._cartService.currenteDataCart$.subscribe(() => {
        this._router.navigate(['/', this.locale, this.country, 'account', 'checkout', 'resumen'], { 
          queryParams: { 
            initialized: true, 
            from: 'step2' 
          }
        });
    });
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    
    // if (this.shouldCleanGuest) {
    //   const guestData = sessionStorage.getItem("user_guest");
    //   if (guestData) {
    //     const parsedGuest = JSON.parse(guestData);

    //     const deleteSubscription = this._authEcommerce.deleteGuestAndAddresses().subscribe(
    //       (resp:any) => {
    //         sessionStorage.removeItem("user_guest");
    //         this._authEcommerce._authService.userGuestSubject.next(null);
    //         this._authService.addGuestLocalStorage();
    //       }, error => {
    //         console.error("Error eliminando guest y addresses", error);
    //       }
    //     );

    //     this.subscriptions.add(deleteSubscription);
    //   }  
    // }
    
    // this.destroy$.next();
    // this.destroy$.complete();
  }
}
