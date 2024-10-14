import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { Router } from '@angular/router';
import { SubscriptionService } from 'src/app/services/subscription.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function actionNetxCheckout([]):any;

declare function shopFilterWidget():any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;
declare var paypal:any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  euro = "€";

  @ViewChild('paypal',{static: true}) paypalElement?: ElementRef;
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
  isSaleSuccess = false; // Inicialmente no hay venta exitosa

  //userId: any;
  CURRENT_USER_AUTHENTICATED:any=null;

  isAddressSameAsShipping: boolean = false;
  isSuccessRegisteredAddredd : boolean = false;

  public loading: boolean = false;

  isLastStepActive_1: boolean = false;
  isLastStepActive_2: boolean = false;
  isLastStepActive_3: boolean = false;
  isLastStepActive_4: boolean = false;

  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;

  constructor(
    public _authEcommerce: EcommerceAuthService,
    public _cartService: CartService,
    public _router: Router,
    private subscriptionService: SubscriptionService,
  ) {}

  ngOnInit(): void {

    this.subscriptionService.setShowSubscriptionSection(false);

    this._authEcommerce.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this._authEcommerce._authService.user.subscribe(user => {
      if (user) {
        this.CURRENT_USER_AUTHENTICATED = user;
      }
    });

    this.checkIfAddressClientExists();


    setTimeout(() => {
      HOMEINITTEMPLATE($);
      actionNetxCheckout($);
      //shopFilterWidget();
    }, 50);

    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
    });

    paypal.Buttons({
      // optional styling for buttons
      // https://developer.paypal.com/docs/checkout/standard/customize/buttons-style-guide/
      style: {
        color: "gold",
        shape: "rect",
        layout: "vertical"
      },

      // set up the transaction
      createOrder: (data:any, actions:any) => {
          // pass in any options from the v2 orders create call:
          // https://developer.paypal.com/api/orders/v2/#orders-create-request-body

          if (this.listCarts.lenght == 0) {
            alertDanger("No se puede proceder con la orden si el carrito está vacío.");
            return;
          }

          if (!this.address_client_selected) {
            //alertDanger("Por favor, seleccione una dirección de envío.");
            this.validMessage = true;
            this.errorOrSuccessMessage = "Por favor, seleccione la dirección de envío correspondiente.";
            return;
          }
          const createOrderPayload = {
            purchase_units: [
              {
                amount: {
                    description: "COMPRAR POR EL ECOMMERCE",
                    value: this.totalCarts
                }
              }
            ]
          };

          return actions.order.create(createOrderPayload);
      },

      // finalize the transaction
      onApprove: async (data:any, actions:any) => {
          let Order = await actions.order.capture();
         
          // Order.purchase_units[0].payments.captures[0].id
          let sale = {
            user: this.CURRENT_USER_AUTHENTICATED._id, //this.CURRENT_USER_AUTHENTICATED._id,//this._authEcommerce._authService.user._id,
            currency_payment: "EUR",
            method_payment: "PAYPAL",
            n_transaction: Order.purchase_units[0].payments.captures[0].id,
            total: this.totalCarts,
            //curreny_total: ,
            //price_dolar: ,
          };

          let sale_address = {
            name: this.name,
            surname: this.surname,
            pais: this.pais,
            address: this.address,
            referencia: '',
            ciudad: this.ciudad,
            region: this.poblacion,
            telefono: this.phone,
            email: this.email,
            nota: '',
          };

          this._authEcommerce.registerSale({sale: sale, sale_address:sale_address}).subscribe((resp:any) => {

            this.isLastStepActive_3 = false;
            
            setTimeout(() => {
              if (resp.code === 403 ) {
                alertDanger(resp.message); // Muestra de error
                
                return;
              } else {
                alertSuccess(resp.message); // Muestra el mensaje de éxito
                
                //setTimeout(() => {
                    //location.reload(); // Recarga la página después de 100 ms
                    //this._router.navigate(['/order-success'], { state: { sale: resp.sale, saleDetails: resp.saleDetails } });
                    this.sale = resp.sale;
                    this.saleDetails = resp.saleDetails;

                    this.isLastStepActive_2 = true;
                    
                    this.isLastStepActive_4 = true;
                    this.isSaleSuccess = true; // Actualiza el estado de éxito
                    this.subscriptionService.setShowSubscriptionSection(false);
                    this._cartService.resetCart();
                    
                    
                //}, 3500);
              }
          }, 100);
            
          })
          // return actions.order.capture().then(captureOrderHandler);
      },

      // handle unrecoverable errors
      onError: (err:any) => {
          console.error('An error prevented the buyer from checking out with PayPal');
      }
    }).render(this.paypalElement?.nativeElement);
  }

  checkIfAddressClientExists() {
    this._authEcommerce.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
      this.listAddressClients = resp.address_client;
      if (this.listAddressClients.length === 0) {
        // Guarda la URL actual en sessionStorage
        sessionStorage.setItem('returnUrl', this._router.url);
        
        // Redirige al formulario de agregar dirección
        this._router.navigate(['/myaddress/add']);
      }
    });
  }

  navigateToHome() {
    this.subscriptionService.setShowSubscriptionSection(true);
    this._router.navigateByUrl("/");
  }

  goToNextStep() {
    // Aquí puedes agregar cualquier otra lógica antes de activar la última pestaña
    this.isLastStepActive_2 = true;
    this.isLastStepActive_3 = true;
    this.isLastStepActive_4 = false;
    this.isSaleSuccess = false;
  }

  onCheckboxChange(event: any) {
    this.isAddressSameAsShipping = event.target.checked;
  }


  removeAllCart(user_id: any) {

    console.log("--Debug: CURRENT_USER_AUTHENTICATED ID: ", user_id);
    
    this._cartService.deleteAllCart(user_id).subscribe((resp: any) => {
        // Aquí puedes manejar la respuesta, por ejemplo:
        console.log(resp.message_text);
        this._cartService.resetCart();  // Resetea el carrito local después de eliminar
    }, (error) => {
        console.error("Error al eliminar el carrito:", error);
    });
}


  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      this._cartService.removeItemCart(cart);
    });
  }

  apllyCupon() {
    let data = {
      code: this.code_cupon,
      user_id: this.CURRENT_USER_AUTHENTICATED._id,//this._cartService._authService.user._id,
    }

    this._cartService.apllyCupon(data).subscribe((resp:any) => {
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
      this._cartService.listCarts(/*this._cartService._authService.user._id*/this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp:any) => {
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });
      });
    }
  }

  store() {
    if (this.address_client_selected) {
      this.updateAddress();
    } else {
      this.registerAddress();
    }
  }

  private registerAddress() {

    if ( !this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.ciudad || !this.email || !this.phone ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      alertDanger("Por favor, complete los campos obligatorios de la dirección de envío");
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
    
    this._authEcommerce.registerAddressClient(data).subscribe( ( resp:any ) => {

      if ( resp.status == 200 ) {

        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();
        alertSuccess(resp.message);
        this.resetForm();
        //this.router.navigate(['/myaddress']);
        
        // Redirige a returnUrl si existe, o a /myaddress por defecto
        //this.router.navigate([this.returnUrl]);
        $('#addNewModal').modal('hide'); // Para Bootstrap

      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al registrar la dirección.";
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      }
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al registrar la dirección.";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
    });
  }

  private updateAddress() {
    
    if ( !this.name || !this.surname || !this.pais || !this.address || !this.zipcode || !this.poblacion || !this.email || !this.phone ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      //alertDanger("Por favor, complete los campos obligatorios de la dirección de envío.");
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

      if ( resp.status == 200 ) {

        let INDEX = this.listAddressClients.findIndex((item:any) => item.id == this.address_client_selected.id);
        this.listAddressClients[INDEX] = resp.address_client;

        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
        
        alertSuccess(resp.message);
        this.resetForm();
        $('#addEditModal').modal('hide'); // Para Bootstrap

      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al actualizar la dirección.";
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      }
      
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al actualizar la dirección.";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
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
    console.log("this.address_client_selected: ", this.address_client_selected);
    
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
}
