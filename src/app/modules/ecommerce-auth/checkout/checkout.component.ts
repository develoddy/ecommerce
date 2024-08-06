import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { Router } from '@angular/router';

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
  name:any=null;
  surname:any=null;
  pais:any="Spain";
  address:any=null;
  referencia:any=null;
  region:any=null;
  ciudad:any=null;
  telefono:any=null;
  email:any=null;
  nota:any=null;
  
  address_client_selected:any = null;

  listCarts:any = [];
  totalCarts:any=null;

  show = false;
  user:any;
  code_cupon:any=null;

  constructor(
    public _authEcommerce: EcommerceAuthService,
    public _cartService: CartService,
    public _router: Router,
  ) {}

  ngOnInit(): void {
    //this.reloadPage();
    this.user = this._cartService._authService.user;
    
    this._authEcommerce.listAddressClient(this._authEcommerce._authService.user._id).subscribe((resp:any) => {
      this.listAddressClients = resp.address_client;
    });

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
            alertDanger("No se puede procesar la orden sin ningun elemento dentro del carrito");
            return;
          }

          if (!this.address_client_selected) {
            alertDanger("Por favor, seleccione una dirección de envío.");
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
            user: this._authEcommerce._authService.user._id,
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
            referencia: this.referencia,
            ciudad: this.ciudad,
            region: this.region,
            telefono: this.telefono,
            email: this.email,
            nota: this.nota,
          };

          this._authEcommerce.registerSale({sale: sale, sale_address:sale_address}).subscribe((resp:any) => {
           
            setTimeout(() => {
              alertSuccess(resp.message); // Muestra el mensaje de éxito
              setTimeout(() => {
                  //location.reload(); // Recarga la página después de 100 ms
                  this._router.navigate(['/order-success'], { state: { sale: resp.sale, saleDetails: resp.saleDetails } });
              }, 3500);
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

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      this._cartService.removeItemCart(cart);
    });
  }

  // CUpon
  apllyCupon() {
    let data = {
      code: this.code_cupon,
      user_id: this._cartService._authService.user._id,
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
      this._cartService.listCarts(this._cartService._authService.user._id).subscribe((resp:any) => {
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });
      });
    }
  }

  private reloadPage(): void {
    const reloaded = sessionStorage.getItem('reloaded');
    if (!reloaded) {
      sessionStorage.setItem('reloaded', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('reloaded');
    }
  }

  store() {
    console.log("debugg this.address_client_selected", this.address_client_selected);
    if (this.address_client_selected) {
      this.updateAddress();
    } else {
      this.registerAddress();
    }
  }

  registerAddress() {
    if (!this.name ||
        !this.surname ||
        !this.pais ||
        !this.address ||
        !this.region ||
        !this.ciudad ||
        !this.telefono ||
        !this.email
    ) {
      alertDanger("Por favor, complete los campos obligatorios de la dirección.");
      return;
    }
    let data = {
        user: this._authEcommerce._authService.user._id,
        name:this.name,
        surname:this.surname,
        pais:this.pais,
        address:this.address,
        referencia:this.referencia,
        region:this.region,
        ciudad:this.ciudad,
        telefono:this.telefono,
        email:this.email,
        nota:this.nota,
    };
    this._authEcommerce.registerAddressClient(data).subscribe((resp:any) => {
      this.listAddressClients.push(resp.address_client);
      alertSuccess(resp.message);
      this.resetForm();
    });
  }

  updateAddress() {
    if (!this.name ||
      !this.surname ||
      !this.pais ||
      !this.address ||
      !this.region ||
      !this.ciudad ||
      !this.telefono ||
      !this.email
    ) {
      alertDanger("Por favor, complete los campos obligatorios de la dirección.");
      return;
    }

    let data = {
        _id: this.address_client_selected.id,
        user: this._authEcommerce._authService.user._id, //this._authEcommerce._authService.user._id,
        name:this.name,
        surname:this.surname,
        pais:this.pais,
        address:this.address,
        referencia:this.referencia,
        region:this.region,
        ciudad:this.ciudad,
        telefono:this.telefono,
        email:this.email,
        nota:this.nota,
    };
    this._authEcommerce.updateAddressClient(data).subscribe((resp:any) => {
      let INDEX = this.listAddressClients.findIndex((item:any) => item._id == this.address_client_selected._id);
      this.listAddressClients[INDEX] = resp.address_client;
      alertSuccess(resp.message);
    });
  }

  resetForm() {
    this.name = null;
    this.surname = null;
    this.pais = null;
    this.address = null;
    this.region = null;
    this.ciudad = null;
    this.telefono = null;
    this.email = null;
  }

  newAddress() {
    this.show = true;
    this.resetForm();
    this.address_client_selected = null;
  }

  addressClienteSelected(list_address:any) {
    console.log("DEbugg: Selected Address: ", list_address);
    this.show = true;

    this.address_client_selected = list_address;
    this.name = this.address_client_selected.name;
    this.surname = this.address_client_selected.surname;
    this.pais = this.address_client_selected.pais;
    this.address = this.address_client_selected.address;
    this.referencia = this.address_client_selected.referencia;
    this.region = this.address_client_selected.region;
    this.ciudad = this.address_client_selected.ciudad;
    this.telefono = this.address_client_selected.telefono;
    this.email = this.address_client_selected.email;
    this.pais = this.address_client_selected.pais;
    this.nota = this.address_client_selected.nota;
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
