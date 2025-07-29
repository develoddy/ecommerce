import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { Address, CheckoutService } from '../../_services/checkoutService';
import { LocalizationService } from 'src/app/services/localization.service';
import { environment } from 'src/environments/environment';
import { loadStripe } from '@stripe/stripe-js';
import { StripePayService } from '../../_services/stripePay.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;
declare var paypal:any;

@Component({
  selector: 'app-payment-checkout',
  templateUrl: './payment-checkout.component.html',
  styleUrls: ['./payment-checkout.component.css']
})
export class PaymentCheckoutComponent implements OnInit {

  @ViewChild('paypal', { static: false }) paypalElement!: ElementRef;
  euro = "€";
  selectedAddress: Address | null = null;
  selectedAddressId:  number = 0; 
  listAddressClients:any = [];
  listAddressGuest:any = [];
  addressSelected:any;
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
  usual_shipping_address:boolean=false;
  address_client_selected:any = null;
  listCarts:any = [];
  totalCarts:any=null;
  show = false;
  user:any;
  code_cupon:any=null;
  sale: any;
  saleDetails: any =[];
  isSaleSuccess = false;
  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd : boolean = false;
  public loading: boolean = false;
  public isLoadingStripe = false;
  isLastStepActive_1: boolean = false;
  isLastStepActive_2: boolean = false;
  isLastStepActive_3: boolean = false;
  isLastStepActive_4: boolean = false;
  paypalButtonsInstance: any;
  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  password_identify:string = "";
  email_identify:string = "";
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  width: number = 100; 
  height: number = 100; 
  private subscriptions: Subscription = new Subscription();
  @Output() activate = new EventEmitter<boolean>();
  isPasswordVisible: boolean = false;
  locale: string = "";
  country: string = "";
  stripePromise = loadStripe(environment.stripePublicKey);
  selectedPaymentMethod: 'card' | 'paypal' = 'card';
  paypalRendered: boolean = false;  
  disablePayments: boolean = false;
  

  constructor(
    public _authEcommerce       : EcommerceAuthService  ,
    public _authService         : AuthService           ,
    public _cartService         : CartService           ,
    public _router              : Router                ,
    private subscriptionService : SubscriptionService   ,
    public routerActived        : ActivatedRoute        ,
    private checkoutService     : CheckoutService       ,
    private localizationService : LocalizationService   ,
    private stripePayService    : StripePayService      ,
  ) {
      this.country = this.localizationService.country;
      this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    
    this.loadSPINER();
    this.verifyAuthenticatedUser();
    this.loadCurrentDataCart();
    this.checkDeviceType();
    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 150);

  }

  onPaymentMethodChange() {
    if (this.selectedPaymentMethod === 'paypal') {
      // Esperar que Angular cree el div y luego renderizar
      setTimeout(() => this.payWithPaypal(), 0);
    } else {
      // Si cambia a tarjeta, eliminar botón PayPal para evitar duplicados
      this.destroyPaypalButtons();
    }
  }

  calculateTotal(cart: any[]): number {
    return cart.reduce((sum, item) => {
      const price = Number(item.product?.price_usd || 0);
      return sum + (price * item.cantidad);
    }, 0);
  }

  async payWithStripe() {
    //this.disablePayments = true;
    const stripe = await loadStripe(environment.stripePublicKey);
    if (!stripe) {
      alert('Stripe no pudo cargarse');
      return;
    }

    if (!this.listCarts || this.listCarts.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    
    if( !this.listAddresses || !this.address_client_selected) {
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, seleccione la dirección de envío correspondiente.";
      return;
    }

    const payload = {
      cart    : this.listCarts,
      userId    : this.CURRENT_USER_AUTHENTICATED?._id || null,
      guestId : this.CURRENT_USER_GUEST?._id || null,
      //guestId: this.CURRENT_USER_AUTHENTICATED ? this.CURRENT_USER_AUTHENTICATED?._id : this.CURRENT_USER_GUEST?._id,
      address : {
        name      : this.name       ,
        surname   : this.surname    ,
        email     : this.email      ,
        pais      : this.pais       ,
        ciudad    : this.ciudad     ,
        region    : this.poblacion  ,
        telefono  : this.phone      ,
        address   : this.address    ,
      }
    };

    console.log(payload);

    // Guarda el payload antes de redirigir
    this.checkoutService.setSalePayload(payload);

    // Aquí llama a tu backend para crear la sesión
    try {
      const session: any = await firstValueFrom(
        this.stripePayService.createStripeSession(payload)
      );

      if (!session?.id) {
        throw new Error("El backend no devolvió un ID de sesión.");
      }

      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        console.error('Stripe error:', result.error.message);
      }

    } catch (err) {
      console.error('Error al crear la sesión de Stripe', err);
    }

  }

  payWithPaypal() {
    this.disablePayments = false;
    if ( this.paypalRendered || !this.paypalElement?.nativeElement ) return;

    this.paypalRendered = true;

    const isGuest = !this.CURRENT_USER_AUTHENTICATED; 

    let buttonStyle = {
      layout  : 'horizontal'  ,
      color   : 'black'       , // gold
      shape   : 'rect'        , // rect or pill
      label   : 'paypal'      , 
      tagline : false         ,
      height  : 50            ,
    };
  
    if (this.isMobile) {
      buttonStyle = {
        layout    : 'horizontal'  ,
        color     : 'black'       , // gold
        shape     : 'rect'        , // rect or pill
        label     : 'paypal'      , 
        tagline   : false         ,
        height    : 45            ,
      };
    } else if (this.isTablet) {
      buttonStyle = {
        layout: 'horizontal',
        color: 'black', //gold
        shape: 'rect', // rect // pill
        label: 'paypal', // Alternativa que suele respetar tagline
        tagline: false,
        height: 45
      };
    } // isDesktop usa el default

    paypal.Buttons({

      style: buttonStyle,

      // set up the transaction
      createOrder: (data:any, actions:any) => {
          if ( this.listCarts.length == 0 ) {
            alertDanger("No se puede proceder con la orden si el carrito está vacío.");
            return;
          }

          if( !this.listAddresses || !this.address_client_selected ) {
            this.validMessage = true;
            this.errorOrSuccessMessage = "Por favor, seleccione la dirección de envío correspondiente.";
            return;
          }

          const createOrderPayload = {
            purchase_units: [{
                amount: {
                    description: "COMPRAR POR EL ECOMMERCE",
                    value: this.totalCarts
                }
              }]
          };

          return actions.order.create(createOrderPayload);
      },

      // finalize the transaction
      onApprove: async (data:any, actions:any) => {
          let Order = await actions.order.capture();
          let sale = {
            user            : this.CURRENT_USER_AUTHENTICATED ? this.CURRENT_USER_AUTHENTICATED._id : undefined    ,
            guestId         : this.CURRENT_USER_GUEST ? this.CURRENT_USER_GUEST._id : null                        ,
            currency_payment: "EUR"                                                                               ,
            method_payment  : "PAYPAL"                                                                            ,
            n_transaction   : "PAYPAL_CHECKOUT_"+Order.purchase_units[0].payments.captures[0].id                   ,
            total           : this.totalCarts                                                                     ,
          };

          let sale_address = {
            name      : this.name     ,
            surname   : this.surname  ,
            pais      : this.pais     ,
            address   : this.address  ,
            referencia: ''            ,
            ciudad    : this.ciudad   ,
            region    : this.poblacion,
            telefono  : this.phone    ,
            email     : this.email    ,
            nota      : ''            ,
          };

          this._authEcommerce.registerSale({sale: sale, sale_address:sale_address}, isGuest).subscribe(
            ( resp:any ) => {

              this.isLastStepActive_3 = false;

              setTimeout(() => {

                if ( resp.code === 403 ) {
                  alertDanger(resp.message);
                  return;

                } else {
                  alertSuccess(resp.message);
                  this.subscriptionService.setShowSubscriptionSection(false);
                  this._cartService.resetCart();
                  this.checkoutService.setSaleSuccess(true); // Actualiza el servicio para indicar que la venta fue exitosa
                  this.checkoutService.setSaleData(resp);
                  this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'successfull'
                  ], { 
                    queryParams: { 
                      initialized: true, 
                      from: 'step4' 
                    } 
                  });
                }
              }, 100);  
          });
          // return actions.order.capture().then(captureOrderHandler);
      },

      // handle unrecoverable errors
      onError: (err:any) => {
          console.error('An error prevented the buyer from checking out with PayPal');
      }
    }).render(this.paypalElement?.nativeElement);
  }

  destroyPaypalButtons() {
    this.paypalRendered = false;
    if (this.paypalElement?.nativeElement) {
      this.paypalElement.nativeElement.innerHTML = ''; // limpia el contenedor
    }
  }

  loadSPINER() {

    this.stripePayService.loading$.subscribe(isLoading => {
      this.isLoadingStripe = isLoading;
    });
    
    this.subscriptionService.setShowSubscriptionSection(false);
    this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  loadCurrentDataCart() {
    this.subscriptions.add(
      this._cartService.currenteDataCart$.subscribe((resp:any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      })
    );
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
  
  private verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.subscribe(user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.CURRENT_USER_GUEST = null;
        this.checkIfAddressClientExists();
      } else {
        this._authEcommerce._authService.userGuest.subscribe(guestUser => {
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
      this._authEcommerce.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
        (resp: any) => {
          this.listAddressClients = resp.address_client;
          this.restoreSelectedAddress(this.listAddressClients, 'selectedAddressId');
      });
    }
  }

  checkIfAddressGuestExists() {
    if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listAddressGuest().subscribe(
        (resp: any) => {
          this.listAddressGuest = resp.addresses;
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
      this.addressClienteSelected(this.selectedAddress);
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
    }
  }

  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.locale, this.country, 'shop', 'home']);
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

  private registerAddress() {
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
        usual_shipping_address:  this.usual_shipping_address,
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

  private updateAddress() {
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
      usual_shipping_address:  this.usual_shipping_address,
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
    this.usual_shipping_address = false;
  }

  newAddress() {
    this.show = true;
    this.resetForm();
    this.address_client_selected = null;
  }


  gotoResumen() {
    this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
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
    this.usual_shipping_address = this.address_client_selected.this.usual_shipping_address;
  }

  onAddressChange(event:any) {
    const selectedIndex = event.target.value;
    // listAddresses
    if (selectedIndex !== "") {
      //const selectedAddress = this.listAddressClients[selectedIndex];
      const selectedAddress = this.listAddresses[selectedIndex];
      this.addressClienteSelected(selectedAddress);
    }
  }

  get listAddresses(): any[] {
    return this.CURRENT_USER_AUTHENTICATED ? this.listAddressClients : this.listAddressGuest;
  }

  emptyAddress() {
    this.address_client_selected = null;
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
          this._router.navigate(['/', this.locale, this.country, 'account', 'checkout']);
          this._cartService.resetCart();
        } else {
          this.errorAutenticate = true;
          this.errorMessageAutenticate = resp.error.message;
        }
      });
    this.subscriptions.add(subscriptionLogin);
  }

  storeAddress() {
  }

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

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    this.destroyPaypalButtons();
  }
}
