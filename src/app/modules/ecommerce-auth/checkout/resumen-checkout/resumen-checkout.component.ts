import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { CheckoutService } from '../../_services/checkoutService';

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

  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;

  private subscriptions: Subscription = new Subscription();
  @Output() activate = new EventEmitter<boolean>();

  isPasswordVisible: boolean = false;
  locale: string = "";
  country: string = "";

  constructor(
    public _authEcommerce: EcommerceAuthService,
    public _authService: AuthService,
    public _cartService: CartService,
    public _router: Router,
    private subscriptionService: SubscriptionService,
    public routerActived: ActivatedRoute,
    private checkoutService: CheckoutService,
  ) {
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado
      this.country = params.get('country') || 'es'; // Valor predeterminado
    });
  }

  ngAfterViewInit() {}

  ngOnInit(): void {

    this.subscriptionService.setShowSubscriptionSection(false);
    this.subscriptions = this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser();
    this.checkIfAddressClientExists();
    //this.storeAllCarts();
    
    
    this.subscriptions.add(
      this._cartService.currenteDataCart$.subscribe((resp:any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      })
    );

    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 150);
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
    console.log(this.CURRENT_USER_GUEST.user_guest);
    
    this._cartService.listCartsCache(this.CURRENT_USER_GUEST.user_guest).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => {
        console.log(cart);
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

  private verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.subscribe(user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        this.CURRENT_USER_GUEST = null; // Si hay usuario autenticado, se ignora el invitado
        //console.log("Compra como usuario registrado", this.CURRENT_USER_AUTHENTICATED);
      } else {
        this._authEcommerce._authService.userGuest.subscribe(guestUser => {
          if (guestUser?.guest) {
            this.CURRENT_USER_GUEST = guestUser;
            //console.log("Compra como invitado", this.CURRENT_USER_GUEST);
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
          if (this.listAddressClients.length === 0) {
            sessionStorage.setItem('returnUrl', this._router.url);
            this._router.navigate(['/', this.locale, this.country, 'account', 'myaddresses', 'add']);
          }
      });
    } else if (this.CURRENT_USER_GUEST) {
      this._authEcommerce.listOneAdessGuest(this.CURRENT_USER_GUEST._id).subscribe(
        (resp: any) => {
          if (resp.addresses.length === 0) {
            alertWarning("Este usuario invitado no tiene direcciones guardadas");
          } else {
            this.listAddressGuest = resp.addresses;
          }
        }, error => {
          alertDanger(error.message);
        });
    }
  }

  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigate(['/', this.locale, this.country, 'shop', 'home']);
  }

  goToNextStep() {
    this.checkoutService.setNavigatingToPayment(true);
    this._router.navigate(['/', this.locale, this.country, 'account', 'checkout', 'payment']);
    // .then(() => {
    //   window.location.reload();
    // });
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
          this.storeAllCarts();//this.listAllCarts();
        }
    });
  }

  storeAddress() {
    this.address_client_selected ? this.storeUpdateAddress(): this.registerAddress();
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
    if (!this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.email || !this.phone) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, rellene los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      return;
    }

    let data = {
      _id       : this.address_client_selected.id,
      user      : this.CURRENT_USER_AUTHENTICATED ? this.CURRENT_USER_AUTHENTICATED._id : this.CURRENT_USER_GUEST,
      name      : this.name,
      surname   : this.surname,
      pais      : this.pais,
      address   : this.address,
      zipcode   : this.zipcode,
      poblacion : this.poblacion,
      email     : this.email,
      phone     : this.phone,
    };

    console.log("369-> data", data);
  
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
    // Usar Angular para manejar la visibilidad del modal o un servicio
    $('#addEditModal').modal('hide');
  }
  /* -------------------------------------------------------- FIN --------------------------------------------------- */


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

    // const guestData = sessionStorage.getItem("user_guest");
    // if (guestData) {
    //   const parsedGuest = JSON.parse(guestData);

    //   const deleteSubscription = this._authEcommerce.deleteGuestAndAddresses().subscribe({
    //     next: () => {
    //       console.log("Datos de invitado eliminados con éxito.");
    //       sessionStorage.removeItem("user_guest");
    //       this._authEcommerce._authService.userGuestSubject.next(null);
    //     },
    //     error: err => {
    //       console.error("Error eliminando guest y addresses", err);
    //     }
    //   });

    //   this.subscriptions.add(deleteSubscription); // Añadimos la suscripción a la lista para asegurar que se mantenga activa
    // }
    
  }
}
