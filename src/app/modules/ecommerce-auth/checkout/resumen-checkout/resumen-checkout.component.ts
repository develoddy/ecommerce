import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;
declare function alertDanger([]):any;
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
  CURRENT_USER_AUTHENTICATED:any=null;
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
  ) {
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado
      this.country = params.get('country') || 'es'; // Valor predeterminado
    });
  }

  ngAfterViewInit() {
   
  }

  ngOnInit(): void {
    this.subscriptionService.setShowSubscriptionSection(false);
    this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser();

    this.checkIfAddressClientExists();
  
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });

    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
    }, 50);
  }

  private verifyAuthenticatedUser(): void {
    this._authEcommerce._authService.user.subscribe(user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.isLastStepActive_1 = true;
      }
    });
  }

  checkIfAddressClientExists() {
    this._authEcommerce.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe(
      (resp: any) => {
        this.listAddressClients = resp.address_client;
        if (this.listAddressClients.length === 0) {
          sessionStorage.setItem('returnUrl', this._router.url); // Guarda la URL actual en sessionStorage
          this._router.navigate(['/', this.locale, this.country, 'account', 'myaddresses', 'add']); // Redirige al formulario de agregar dirección
        }
    });
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
