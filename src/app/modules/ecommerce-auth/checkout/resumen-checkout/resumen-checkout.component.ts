import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { Address, CheckoutService } from '../../_services/checkoutService';
import { MinicartService } from 'src/app/services/minicartService.service';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

// interface Address {
//   id: string;
//   name: string;
//   surname: string;
//   email: string;
//   address: string;
//   zipcode: string;
//   poblacion: string;
//   ciudad: string;
//   phone: string;
//   usual_shipping_address: boolean;
// }

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
  isLastStepActive_2: boolean = false;
  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  password_identify:string = "";
  email_identify:string = "";
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  selectedAddressId:  number = 0; // Dirección seleccionada
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
    private minicartService: MinicartService,
    private subscriptionService: SubscriptionService,
    public routerActived: ActivatedRoute,
    private checkoutService: CheckoutService,
    private cdr: ChangeDetectorRef,
  ) {
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  
      this.country = params.get('country') || 'es'; 
    });
  }

  ngAfterViewInit() {}

  ngOnInit(): void {
    this.verifyAuthenticatedUser();
    this.currentDataCart();
    setTimeout(() => {
      this.loadLoading();
      setTimeout(() => {
        HOMEINITTEMPLATE($);
        actionNetxCheckout($);
      }, 150);
    }, 1000);
  }

  private loadLoading() {
    this.subscriptionService.setShowSubscriptionSection(false);
    this.subscriptions = this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  private currentDataCart() {
    this.subscriptions.add(
      this._cartService.currenteDataCart$.subscribe((resp:any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      })
    );
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
          // ✅ Restaurar dirección seleccionada para autenticado
          this.restoreSelectedAddress(this.listAddressClients, 'selectedAddressId');

          if (this.listAddressClients.length === 0) {
            // GUARDA LA URL ACTUAL EN SESSION STORARE
            sessionStorage.setItem('returnUrl', this._router.url); 
            // SOLO REDIRIGE A myaddresses SI NO ESTÁ EN RESUMEN
            this._router.navigate(['/', , this.country, this.locale, 'account', 'myaddresses', 'add']); 
          } else {
            this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
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
          // ✅ Restaurar dirección seleccionada para invitado
          this.restoreSelectedAddress(this.listAddressGuest, 'selectedGuestAddressId');

          if (this.listAddressGuest.length === 0) {
            this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'delivery']);
          } else {
            this._router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
          }
      });
    }
  }

  restoreSelectedAddress(list: any[], storageKey: string) {

    // 1. Buscar dirección habitual en db
    const habitual = list.find(addr => addr.usual_shipping_address === true);
    if (habitual) {
      this.selectedAddressId = habitual.id;
      this.selectedAddress = habitual;
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
  
  goToNextStep() {
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
        usual_shipping_address: this.usual_shipping_address,
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
    if (selected) {

      // 1) Guarda en el servicio de checkout
      this.checkoutService.setSelectedAddress(selected);
      this.selectedAddress = selected;

      // 2) Guardar en sessionStorage (según el tipo de usuario)
      const storageKey = this.CURRENT_USER_AUTHENTICATED ? 'selectedAddressId' : 'selectedGuestAddressId';
      sessionStorage.setItem(storageKey, this.selectedAddressId.toString());

      // 3) Si se seleccionó como habitual, actualizar en backend
      //if (this.usual_shipping_address) {
        const userId = this.CURRENT_USER_AUTHENTICATED._id; // Asegúrate que esté accesible _authEcommerce
        this._authEcommerce.setAsUsualShippingAddress(this.selectedAddressId, userId).subscribe({
          next: () => {
            console.log("Dirección marcada como habitual");
      
            // 🔄 Recargar lista de direcciones
            this.loadAddresses(); // <-- tu método que llama al backend y actualiza this.listAddresses
          },
          error: (err) => console.error("Error al actualizar dirección habitual", err)
        });
      //}

      this.closeMiniAdress();
    } 
  }

  loadAddresses() {
    if (this.CURRENT_USER_AUTHENTICATED) {
      this.checkIfAddressClientExists();
    } else if (this.CURRENT_USER_GUEST) {
      this.checkIfAddressGuestExists();
    }
  }

  goToRegisterAddress() {
    this._router.navigate(['/', this.country, this.locale, 'account', 'myaddresses', 'add'], {
      queryParams: { returnUrl: `/${this.country}/${this.locale}/account/checkout` }
    });
  }

  closeMiniAdress(): void {
    this.minicartService.closeMiniAddress();
  }

  openAddressModal() {
    if (!this.selectedAddressId && this.listAddresses.length > 0) {
      this.selectedAddressId = this.listAddresses[0].id;
    }
    this.minicartService.openMiniAddress();
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
      usual_shipping_address: this.usual_shipping_address,
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
  /* -------------------------------------------------------- FIN ACTUALIZACION DE DIRECCIONES --------------------------------------------------- */

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
