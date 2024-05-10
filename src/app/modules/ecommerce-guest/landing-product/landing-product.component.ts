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
  discount_id:any;
  SALE_FLASH:any = null;

  REVIEWS:any=null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;

  activeIndex: number = 0; // Inicializar el índice activo

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

    this._routerActived.queryParams.subscribe((resp:any) => {
      this.discount_id = resp["_id"];
    });

    
    this._ecommerce_guestService.showLandingProduct(this.slug, this.discount_id).subscribe((resp:any) => {
      this.product_selected = resp.product;
      console.log("Debugg: showLandingProduct ---------");
      
      console.log(this.product_selected);
      
      this.related_products = resp.related_products;
      this.SALE_FLASH = resp.SALE_FLASH;
      this.REVIEWS = resp.REVIEWS;
      this.AVG_REVIEW = resp.AVG_REVIEW;
      this.COUNT_REVIEW = resp.COUNT_REVIEW;
      setTimeout(() => {
        LandingProductDetail();
      }, 50);
    });
  }

  // Función para cambiar el índice activo cuando se hace clic en una variedad
  setActiveIndex(index: number) {
    this.activeIndex = index;
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

  getDiscount() {
    let discount = 0;
    if (this.SALE_FLASH) {
      if (this.SALE_FLASH.type_discount == 1) {
        return (this.SALE_FLASH.discount*this.product_selected.price_usd*0.01).toFixed(2);
      } else {
        return this.SALE_FLASH.discount;
      }
    }
    return discount;
  }

  // getDiscountProduct(besProduct:any, is_sale_flash:any=null) {
  //   if (is_sale_flash) {
  //     if (this.SALE_FLASH.type_discount == 1) { // 1 porcentaje
  //       return (besProduct.price_usd*this.SALE_FLASH.discount*0.01).toFixed(2);
  //     } else { // 2 es moneda
  //       return this.SALE_FLASH.discount;
  //     }
  //   } else {
  //     if (besProduct.campaing_discount) {
  //       if (besProduct.campaing_discount.type_discount == 1) { // 1 porcentaje
  //         //return besProduct.price_usd*besProduct.campaing_discount.discount*0.01;
  //         return (besProduct.price_usd*besProduct.campaing_discount.discount*0.01).toFixed(2);
  //       } else { // 2 es moneda
  //         return besProduct.campaing_discount.discount;
  //       }
  //     }
  //   }
  //   return 0;
  // }

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
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected._id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),  //*$("#qty-cart").val(),
      total: (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val(), // De momento es igual, luego aplicamos el descuento
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
    });
  }
}
