import { Component, OnInit } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../_service/cart.service';

declare var $:any;
declare function LandingProductDetail():any;
declare function ModalProductDetail():any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-landing-product',
  templateUrl: './landing-product.component.html',
  styleUrls: ['./landing-product.component.css']
})
export class LandingProductComponent implements OnInit {

  slug:any=null;
  product_selected:any = null;
  product_selected_modal:any=null;
  related_products:any = [];
  variedad_selected:any=null;

  constructor(
    public _ecommerce_guestService: EcommerceGuestService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public _cartService: CartService,
  ) {}

  ngOnInit(): void {
    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
    });

    console.log(this.slug);
    this._ecommerce_guestService.showLandingProduct(this.slug).subscribe((resp:any) => {
      console.log(resp);
      this.product_selected = resp.product;
      this.related_products = resp.related_products;

      setTimeout(() => {
        LandingProductDetail();
      }, 50);
    });
  }

  openModal(besProduct:any, FlashSale:any=null) {
    this.product_selected_modal = null;
    setTimeout(() => {
      this.product_selected_modal = besProduct;
      this.product_selected_modal.FlashSale = FlashSale;
      setTimeout(() => {
        ModalProductDetail();
      }, 50);
    }, 150);
  }

  getCalNewPrice(product:any) {
    // if (this.FlashSale.type_discount == 1) {
    //   return product.price_soles - product.price_soles*this.FlashSale.discount*0.01;
    // } else {
    //   return product.price_soles - this.FlashSale.discount;
    // }
    return 0;
  }

  selectedVariedad(variedad:any) {
    this.variedad_selected = variedad;
  }

  addCart(product:any) {
    if (!this._cartService._authService.user) {
      alertDanger("Necesitas autenticarte para poder agregar el producto al carrito");
      return;
    }
    if ($("#qty-cart").val() == 0) {
      alertDanger("Necesitas agregar una cantidad mayor a 0 para el carrito");
      return;
    }
    if (this.product_selected.type_inventario == 2) {
      if (!this.variedad_selected) {
        alertDanger("Necesitas seleccinonar una variedad para el carrito");
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          alertDanger("Necesitas agregar una cantidad menor porque no se tiene el stock suficiente");
          return; 
        }
      }
    }

    let data = {
      user: this._cartService._authService.user._id,
      product: this.product_selected._id,
      type_discount: null,
      discount: 0,
      cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected._id : null,
      code_cupon: null,
      code_discount: null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd, //*$("#qty-cart").val(),
      total: this.product_selected.price_usd*$("#qty-cart").val(), // De momento es igual, luego aplicamos el descuento
    }
    this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto se ha agregado correctamente al carrito")
      }
    }, error => {
      console.log(error);
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        console.log("el token expiro...");
        
        this._cartService._authService.logout();
      }
      
    })
    
  }
}
