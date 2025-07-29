import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { CheckoutService } from '../../_services/checkoutService';
import { LocalizationService } from 'src/app/services/localization.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-successfull-checkout',
  templateUrl: './successfull-checkout.component.html',
  styleUrls: ['./successfull-checkout.component.css']
})
export class SuccessfullCheckoutComponent implements OnInit {

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
  shippingAddress:any=null;
  listCarts:any = [];
  totalCarts:any=null;
  show = false;
  user:any;
  code_cupon:any=null;
  sale: any;
  saleDetails: any =[];
  isSaleSuccess = false;
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;
  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd : boolean = false;
  public loading: boolean = false;
  isLastStepActive_1: boolean = false;
  isLastStepActive_2: boolean = false;
  isLastStepActive_3: boolean = false;
  isLastStepActive_4: boolean = false;
  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  password_identify:string = "";
  email_identify:string = "";
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  private subscriptions: Subscription = new Subscription();
  @Output() activate = new EventEmitter<boolean>();
  isPasswordVisible: boolean = false;
  locale: string = "";
  country: string = "";
  saleData: any = null;

  constructor(
    public _authEcommerce       : EcommerceAuthService  ,
    public _authService         : AuthService           ,
    public _cartService         : CartService           ,
    public _router              : Router                ,
    private subscriptionService : SubscriptionService   ,
    public routerActived        : ActivatedRoute        ,
    private checkoutService     : CheckoutService       ,
    private localizationService : LocalizationService   ,
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    const fromStripe = this.routerActived.snapshot.queryParamMap.get('fromStripe');
    if ( fromStripe === '1' ) {
      this.registerStripeSale();
    } else {
      this.saleData = this.checkoutService.getSaleData(); // Venta ya registrada desde PayPal
      this.successPayStripe(); // Procesa datos de venta
    }

    this.activate.emit(true);
    this.subscriptionService.setShowSubscriptionSection(false);
    this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser();
    this.checkIfAddressClientExists();
  
    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 50);
  }

  successPayStripe() {
    this._cartService.currenteDataCart$.subscribe(
    ( resp:any ) => {
      this.sale       = resp;
      this.totalCarts = this.sale.reduce(
        ( sum: number, item: any ) => sum + parseFloat( item.total ), 0
      );

      this.totalCarts = parseFloat( 
        this.totalCarts.toFixed(2) 
      );
    });

    this.checkoutService.saleData$.subscribe(
    ( sale ) => {
      if ( sale ) {
        this.sale           = sale.sale;
        const totalFromSale = sale.sale?.total;

        if ( typeof totalFromSale === 'number' ) {
          this.totalCarts = parseFloat(
            totalFromSale.toFixed(2)
          );

        } else {
          // backup: calcularlo desde saleDetails si total no vino bien
          this.totalCarts = sale.saleDetails.reduce(
            (sum: number, item: any) => sum + parseFloat(item.total), 0
          );

          this.totalCarts = parseFloat(
            this.totalCarts.toFixed(2)
          );
        }
        this.saleDetails = sale.saleDetails; 
      }
    });
  }

  registerStripeSale() {
    const payload = this.checkoutService.getSalePayload();
    if ( !payload ) {
      alertDanger("No se encontraron los datos necesarios de la venta.");
      return;
    }
  
    const sale = {
      user            : payload.userId                      ,
      guestId         : payload.guestId                   ,
      currency_payment: "EUR"                             ,
      method_payment  : "STRIPE"                          ,
      n_transaction   : "STRIPE_CHECKOUT"                 ,
      total           : this.calculateTotal(payload.cart) ,
    };

    const sale_address = payload.address;

    const isGuest = !payload.userId;

    this._authEcommerce.registerSale({ sale, sale_address }, isGuest).subscribe(
      ( resp: any ) => {
        if ( resp.code === 403 ) {
          alertDanger( resp.message );
          return;
        }

        alertSuccess(resp.message);
        this.checkoutService.setSaleData(resp);
        this.checkoutService.setSaleSuccess(true);
        this._cartService.resetCart();
        this.checkoutService.setSaleSuccess(true);
        this.saleData = resp;
        this.successPayStripe();
      },
      ( err ) => {
        alertDanger("Ocurrió un error al registrar la venta con Stripe.");
        console.error(err);
      }
    );
  }

   calculateTotal( cart: any[] ): number {
    return cart.reduce(( sum, item ) => {
      const price = Number( item.product?.price_usd || 0 );
      return sum + ( price * item.cantidad );
    }, 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
  }

  /*private verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.subscribe(user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.isLastStepActive_1 = true;
      }
    });
  }*/

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
          this.shippingAddress = this.listAddressClients[0];
      });
    }
  }

  checkIfAddressGuestExists() {
    if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listAddressGuest().subscribe(
        (resp: any) => {
          this.listAddressGuest = resp.addresses;
          this.shippingAddress = this.listAddressGuest[0];
      });
    }
  }

  // checkIfAddressClientExists() {
  //   this._authEcommerce.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
  //     (resp: any) => {
  //       this.listAddressClients = resp.address_client;
  //       this.shippingAddress = this.listAddressClients[0]; // Asignamos la primera dirección
  //       // NOTA: Ver como se puede configurar para que coja la direccion de envio habitual
  //   });
  // }

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

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
