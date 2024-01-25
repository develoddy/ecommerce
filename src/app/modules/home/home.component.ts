import { Component, OnInit } from '@angular/core';
import { HomeService } from './_services/home.service';
import { CartService } from '../ecommerce-guest/_service/cart.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { Subscription } from 'rxjs';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function ModalProductDetail():any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  sliders:any = [];
  categories:any = [];
  besProducts:any = [];
  ourProducts:any = [];
  product_selected:any=null;
  FlashSale:any = null;
  FlashProductList:any = [];
  variedad_selected:any=null;
  translatedText: string = "";
  //private subscription: Subscription;

  constructor(
    public homeService: HomeService,
    public _cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    //private languageService: LanguageService,
  ) {
    //translate.setDefaultLang('es');
   
  }

  private translateTextAccordingToLanguage(language: string): string {
    // Lógica para traducir el texto según el idioma
    return 'Texto traducido';
  }

  // ngOnDestroy() {
  //   this.subscription.unsubscribe();
  // }

  ngOnInit(): void {

    let TIME_NOW = new Date().getTime();

    this.homeService.listHome(TIME_NOW).subscribe((resp:any) => {
      this.sliders = resp.sliders;
      this.categories = resp.categories;
      this.besProducts = resp.bes_products;
      this.ourProducts = resp.our_products;
      this.FlashSale = resp.FlashSale;
      this.FlashProductList = resp.campaign_products;
      setTimeout(() => {
        if (this.FlashSale) {
          var eventCounter = $(".sale-countdown");
          let PARSE_DATE = new Date(this.FlashSale.end_date);
          console.log((PARSE_DATE.getMonth()+1), PARSE_DATE.getDate());
          let DATE = PARSE_DATE.getFullYear() + "/" + (PARSE_DATE.getMonth()+1) + "/" + (PARSE_DATE.getDate())
          if (eventCounter.length) {
              eventCounter.countdown(DATE, function(e:any) {
                eventCounter.html(
                      e.strftime(
                          "<div class='countdown-section'><div><div class='countdown-number'>%-D</div> <div class='countdown-unit'>Day</div> </div></div><div class='countdown-section'><div><div class='countdown-number'>%H</div> <div class='countdown-unit'>Hrs</div> </div></div><div class='countdown-section'><div><div class='countdown-number'>%M</div> <div class='countdown-unit'>Min</div> </div></div><div class='countdown-section'><div><div class='countdown-number'>%S</div> <div class='countdown-unit'>Sec</div> </div></div>"
                      )
                  );
              });
          }
        }
        HOMEINITTEMPLATE($)
      }, 50);
    });
  }

  openModal(besProduct:any, FlashSale:any=null) {
    this.product_selected = null;
    setTimeout(() => {
      this.product_selected = besProduct;
      this.product_selected.FlashSale = FlashSale;
      setTimeout(() => {
        ModalProductDetail();
      }, 50);
    }, 150);
  }

  getCalNewPrice(product:any) {
    if (this.FlashSale.type_discount == 1) {
      return product.price_usd - product.price_usd*this.FlashSale.discount*0.01;
    } else {
      return product.price_usd - this.FlashSale.discount;
    }
  }

  getDiscountProduct(besProduct:any, is_sale_flash:any=null) {
    if (is_sale_flash) {
      if (this.FlashSale.type_discount == 1) { // 1 porcentaje
        return besProduct.price_usd*this.FlashSale.discount*0.01;
      } else { // 2 es moneda
        return this.FlashSale.discount;
      }
    } else {
      if (besProduct.campaing_discount) {
        if (besProduct.campaing_discount.type_discount == 1) { // 1 porcentaje
          return besProduct.price_usd*besProduct.campaing_discount.discount*0.01;
        } else { // 2 es moneda
          return besProduct.campaing_discount.discount;
        }
      }
    }
    return 0;
  }

  getRouterDiscount(besProduct:any) {
    if (besProduct.campaing_discount) {
      return {_id: besProduct.campaing_discount._id};
    }
    return {};
  }

  addCart(product:any, is_sale_flash:any=null) {
    if (!this._cartService._authService.user) {
      alertDanger("Necesitas autenticarte para poder agregar el producto al carrito");
      return;
    }
    if ($("#qty-cart").val() == 0) {
      alertDanger("Necesitas agregar una cantidad mayor a 0 para el carrito");
      return;
    }
    
    if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
      let LINK_DISCOUNT = "";
      if (is_sale_flash) {
        LINK_DISCOUNT = "?_id="+this.FlashSale._id;
      } else { // Si el producto es de inventario unitario, se envia el producto de manera directa al carrito
        if (product.campaing_discount) {
          LINK_DISCOUNT = "?_id="+product.campaing_discount._id;
        }
      }
      this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
      return;
    }

    let type_discount = null;
    let discount = 0;
    let code_discount = null;
    if (is_sale_flash) {
      type_discount = this.FlashSale.type_discount;
      discount = this.FlashSale.discount;
      code_discount = this.FlashSale._id;
    } else {
      if (product.campaing_discount) {
        type_discount  = product.campaing_discount.type_discount;
        discount = product.campaing_discount.discount;
        code_discount = product.campaing_discount._id;
      }
    }

    let data = {
      user: this._cartService._authService.user._id,
      product: product._id,
      type_discount: type_discount,
      discount: discount,
      cantidad: 1,
      variedad: null,
      code_cupon: null,
      code_discount: code_discount,
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscountProduct(product, is_sale_flash),  //*1,
      total: (product.price_usd - this.getDiscountProduct(product, is_sale_flash))*1, // De momento es igual, luego aplicamos el descuento
    }

    this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto se ha agregado correctamente al carrito");
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
