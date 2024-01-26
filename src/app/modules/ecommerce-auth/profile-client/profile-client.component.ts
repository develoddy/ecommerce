import { Component, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-profile-client',
  templateUrl: './profile-client.component.html',
  styleUrls: ['./profile-client.component.css']
})
export class ProfileClientComponent implements OnInit {

  sale_orders:any = [];
  is_detail_sale:any = false;
  order_selected:any=null;

  //ADDRESS
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

  // Data client
  name_c: any = null;
  surname_c: any = null;
  email_c: any = null;
  password: any = null;
  password_repeat: any = null;

  // Review
  cantidad:any=0;
  description:any=null;
  sale_detail_selected:any=null;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
  ) {}

  ngOnInit(): void {
    this.showProfileClient();
    this.name_c = this._ecommerceAuthService._authService.user.name;
    this.surname_c = this._ecommerceAuthService._authService.user.surname;
    this.email_c = this._ecommerceAuthService._authService.user.email;
    
  }

  showProfileClient() {
    let data = {
      user_id: this._ecommerceAuthService._authService.user._id,
    };

    this._ecommerceAuthService.showProfileClient(data).subscribe((resp:any) => {
      console.log("DEBUGG: ProfileClientComponent showProfile");
      console.log(resp);
      this.sale_orders = resp.sale_orders;
      this.listAddressClients = resp.address_client;
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
      alertDanger("Necesitas ingresar los campos obligatorios de la dirección");
      return;
    }
    let data = {
        user: this._ecommerceAuthService._authService.user._id,
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
    this._ecommerceAuthService.registerAddressClient(data).subscribe((resp:any) => {
      console.log(resp);
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
      alertDanger("Necesitas ingresar los campos obligatorios de la dirección");
      return;
    }
    let data = {
        _id: this.address_client_selected._id,
        user: this._ecommerceAuthService._authService.user._id,
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
      //console.log(resp);
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
    this.resetForm();
    this.address_client_selected = null;
  }

  addressClienteSelected(list_address:any) {
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

  updateProfileClient() {

    if ( this.password == null || this.password == ""  || this.password_repeat == null ) {
      alertWarning("Es obligatorio ingresar ambas contraseñeas para modificar sus datos.");
      return;
    }

    if (this.password) {
      if (this.password != this.password_repeat) {
        alertDanger("Ambas contraseñas son incorrectas. Vuelve a intentarlo.");
        return;
      }
    }

    let data = {
      _id: this._ecommerceAuthService._authService.user._id,
      name: this.name_c,
      surname: this.surname_c,
      email: this.email_c,
      password: this.password,
    };

    this._ecommerceAuthService.updateProfileClient(data).subscribe((resp:any) => {
      console.log(resp);
      alertSuccess(resp.message);
      if (resp.user) {
        localStorage.setItem("user", JSON.stringify(resp.user));
      }
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
      user: this._ecommerceAuthService._authService.user._id,
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

    let data = {
      _id: this.sale_detail_selected.review._id,
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this._ecommerceAuthService._authService.user._id,
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
}
