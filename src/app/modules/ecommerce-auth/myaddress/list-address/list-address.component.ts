import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';

declare var $:any;

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-list-address',
  templateUrl: './list-address.component.html',
  styleUrls: ['./list-address.component.css']
})
export class ListAddressComponent implements OnInit  {

  euro = "€";
  sale_orders:any = [];
  sale_details:any = [];
  is_detail_sale:any = false;
  order_selected:any=null;

  //ADDRESS
  listAddressClients:any = [];
  name:any=null;
  surname:any=null;
  pais:any="Spain";
  address:any=null;
  referencia:any=null;
  zipcode:any=null;
  region:any=null;
  ciudad:any=null;
  telefono:any=null;
  email:any=null;
  nota:any=null;
  birthday:any=null;

  address_client_selected:any = null;

  // Data client
  
  name_c: string = '';
  surname_c: any = null;
  email_c: any = null;
  password: any = null;
  password_repeat: any = null;
  phone_c:any=null;
  zipcode_c:any=null;
  birthday_c:any=null;

  // Review
  cantidad:any=0;
  description:any=null;
  sale_detail_selected:any=null;
  user:any;

  loading: boolean = false;

  loadingSubscription: Subscription = new Subscription();


  CURRENT_USER_AUTHENTICATED:any=null;
  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
  ) {}

  ngOnInit(): void {

    // Suscribirse al observable para saber cuando mostrar u ocultar el loading
    this.loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser();
    this.showProfileClient();
  

    this.name_c = this.CURRENT_USER_AUTHENTICATED.name,//this.user.name; //this._ecommerceAuthService._authService.user.name;
    this.surname_c = this.CURRENT_USER_AUTHENTICATED.surname; //this._ecommerceAuthService._authService.user.surname;
    this.email_c = this.CURRENT_USER_AUTHENTICATED.email; //this._ecommerceAuthService._authService.user.email; 
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
    });
  }

  userDetail:any=null;
  detailUser() {
    let data = {
      email: this.CURRENT_USER_AUTHENTICATED.email,
    }
    this._ecommerceAuthService.detail_user(data).subscribe((resp:any) => {
      console.log(resp);
      
      if (resp.status = 200) {
        this.userDetail = resp.user;

        this.name_c  =  resp.user.name;
        this.surname_c  =  resp.user.surname;
        this.email_c  =  resp.user.email;
        this.phone_c = resp.user.phone;
        this.zipcode_c = resp.user.zipcode;
      }
    });
  }

  showProfileClient() {
    
    let data = {
      user_id: this.CURRENT_USER_AUTHENTICATED._id, //this.user._id, //this._ecommerceAuthService._authService.user._id,
    };

    this._ecommerceAuthService.showProfileClient(data).subscribe((resp:any) => {

      this.sale_orders = resp.sale_orders;

      this.sale_details = [];

      // Recorremos cada objeto en sale_orders
      this.sale_orders.forEach((order: any) => {
        // Verificamos si existe la propiedad sale_details y si es un array
        if (order && order.sale_details && Array.isArray(order.sale_details)) {
          // Añadimos cada detalle de venta a sale_details
          order.sale_details.forEach((detail: any) => {
            this.sale_details.push(detail);
          });
        }
      });

      this.listAddressClients = resp.address_client;
      console.log("Data listAddressClients: ", this.listAddressClients);
      
    });
  }

  getDate(date:any) {
    let newDate = new Date(date);
    return `${newDate.getFullYear()}/${newDate.getMonth()+1}/${newDate.getDate()}`;
  }

  viewDetailSale(order:any) {
    this.is_detail_sale = true;
    this.order_selected = order;
  }

  goHome() {
    this.is_detail_sale = false;
    this.order_selected = null;
  }

  store() {

    if (this.address_client_selected) {
      this.updateAddress();
    } else {
      
      this.registerAddress();
    }
  }

  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  registerAddress() {
    if (!this.name ||
        //!this.surname ||
        !this.pais ||
        !this.address ||
        //!this.region ||
        !this.zipcode ||
        !this.ciudad ||
        !this.telefono ||
        !this.email
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío.";
      this.hideMessageAfterDelay();
      alertDanger("Por favor, complete los campos obligatorios de la dirección de envío.");
      return;
    }
    let data = {
        user: this.CURRENT_USER_AUTHENTICATED._id,
        name: this.name,
        surname: "No hay surname",
        pais:this.pais,
        address:this.address,
        referencia:this.referencia,
        zipcode:this.zipcode,
        region:"No hay region",
        ciudad:this.ciudad,
        telefono:this.telefono,
        email:this.email,
        nota:this.nota,
    };
    this._ecommerceAuthService.registerAddressClient(data).subscribe((resp:any) => {
      
      if (resp.status == 200) {
      
        this.listAddressClients.push(resp.address_client);
        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        this.hideMessageAfterDelay();
        alertSuccess(resp.message);
        
        this.newAddress();

        $('#addNewModal').modal('hide'); // Para Bootstrap
  
        //this.resetForm();
      }else {
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

  updateAddress() {
    
    if (!this.name ||
        //!this.surname ||
        !this.pais ||
        !this.address ||
        //!this.region ||
        !this.zipcode ||
        !this.ciudad ||
        !this.telefono ||
        !this.email
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío.";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      //alertDanger("Por favor, complete los campos obligatorios de la dirección de envío.");
      return;
    }

    let data = {
        _id: this.address_client_selected.id,
        user: this.CURRENT_USER_AUTHENTICATED._id,
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
    this._ecommerceAuthService.updateAddressClient(data).subscribe((resp:any) => {

      if (resp.status == 200) {
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

  // Función para ocultar el mensaje después de unos segundos
  hideMessageAfterDelay() {
    setTimeout(() => {
      this.validMessage = false;
    }, 6000); // Desaparece después de 3 segundos
  }

  resetForm() {
    this.name = null;
    this.surname = null;
    this.pais = null;
    this.address = null;
    this.zipcode = null;
    this.referencia = null;
    this.region = null;
    this.ciudad = null;
    this.telefono = null;
    this.email = null;

    
  }

  newAddress() {
    this.resetForm();
    //this.address_client_selected = null;
  }

  addressClienteSelected(list_address:any) {
    this.address_client_selected = list_address;

    this.errorOrSuccessMessage = null;
    this.validMessage = false;

    this.name = this.address_client_selected.name;
    this.surname = this.address_client_selected.surname;
    this.pais = this.address_client_selected.pais;
    this.address = this.address_client_selected.address;
    this.referencia = this.address_client_selected.referencia;
    this.zipcode = this.address_client_selected.zipcode;
    this.region = this.address_client_selected.region;
    this.ciudad = this.address_client_selected.ciudad;
    this.telefono = this.address_client_selected.telefono;
    this.email = this.address_client_selected.email;
    this.pais = this.address_client_selected.pais;
    this.nota = this.address_client_selected.nota;
  }

  updateProfileClient() {

    // validMessage
    // status

    if( !this.name_c ||  !this.email_c || !this.phone_c || !this.birthday_c  ) {
    //if ( this.password == null || this.password == ""  || this.password_repeat == null ) {

      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, asegúrese de completar todos los campos requeridos en su perfil.";
      //alertWarning("Por favor, asegúrese de completar todos los campos requeridos en su perfil.");
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
      return;
    }

    // if (this.password) {
    //   if (this.password != this.password_repeat) {
    //     alertDanger("Ambas contraseñas son incorrectas. Intentalo denuevo.");
    //     return;
    //   }
    // }

    let data = {
      _id: this.CURRENT_USER_AUTHENTICATED._id,//this.user.id,
      name: this.name_c,
      surname: "",
      email: this.email_c,
      phone: this.phone_c,
      birthday: this.birthday_c,
      //password: this.password,
    };

    this._ecommerceAuthService.updateProfileClient(data).subscribe((resp:any) => {
      if (resp.status == 200) {

        console.log(resp);
        //alertSuccess(resp.message);
        this.status = true;
        this.validMessage = true;
        this.errorOrSuccessMessage = resp.message;
        $('#editProfileModal').modal('hide'); // Para Bootstrap
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
  
        if (resp.user) {
          localStorage.setItem("user", JSON.stringify(resp.user));
        }
      } else {
        this.status = false;
        this.errorOrSuccessMessage = "Error al actualizar los datos del perfil.";
        this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
        
      }
    }, error => {
      this.status = false;
      this.errorOrSuccessMessage = "Error al actualizar los datos del perfil.";
      this.hideMessageAfterDelay();  // Llamamos a la función para ocultar el mensaje después de unos segundos
    });
  }

  removeAddressSelected(list_address:any) {
    console.log(list_address);
    
    this._ecommerceAuthService.deleteAddressClient(list_address.id).subscribe((resp:any) => {      
      let INDEX = this.listAddressClients.findIndex((item:any) => item.id == list_address.id);
      // Verifica si se encontró el elemento
      if (INDEX !== -1) { 
        this.listAddressClients.splice(INDEX, 1); // Elimina 1 elemento a partir del índice INDEX
      }
      alertSuccess(resp.message);
      this.resetForm();
    });
  }

  viewReview(sale_detail:any) {
    this.sale_detail_selected = sale_detail;
    if (this.sale_detail_selected.review) {
      this.cantidad = this.sale_detail_selected.review.cantidad;
      this.description = this.sale_detail_selected.review.description;
    } else {
      this.cantidad = null;
      this.description = null;
    }
  }

  goDetail() {
    this.sale_detail_selected = null;
  }

  addCantidad(cantidad:number) {
    this.cantidad = cantidad; 
  }

  save() {

    if (this.sale_detail_selected.review) {
      this.updateReview();
    } else {
      this.saveReview();
    }
  }

  saveReview() {
    if ( !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }
    
    let data = {
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.CURRENT_USER_AUTHENTICATED._id,//this.user._id,//this._ecommerceAuthService._authService.user._id,
      cantidad: this.cantidad,
      description: this.description,
    };

    this._ecommerceAuthService.registerProfileClientReview(data).subscribe((resp:any) => {
      console.log(resp);
      this.sale_detail_selected.review = resp.review;
      alertSuccess(resp.message);
    });
  }

  updateReview() {
    if ( !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }

    console.log("---- FRON: add reviewe", this.sale_detail_selected);

    let data = {
      _id: this.sale_detail_selected.review.id,
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.CURRENT_USER_AUTHENTICATED._id,//this.user._id,//this._ecommerceAuthService._authService.user._id,
      cantidad: this.cantidad,
      description: this.description,
    };

    this._ecommerceAuthService.updateProfileClientReview(data).subscribe((resp:any) => {
      console.log(resp);
      this.sale_detail_selected.review = resp.review;
      alertSuccess(resp.message);
    });
  }

  logout() {
    this._ecommerceAuthService._authService.logout();
  }

  ngOnDestroy(): void {
    // Desuscribirse al destruir el componente
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

}
