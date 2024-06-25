import { AfterViewInit, Component, OnInit } from '@angular/core';
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
export class LandingProductComponent implements OnInit, AfterViewInit {

  euro = "€";
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

  activeIndex: number = 0;

  selectedColor: string = '';

  filteredGallery: any[] = [];

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
      this.related_products = resp.related_products;
      this.SALE_FLASH = resp.SALE_FLASH;
      this.REVIEWS = resp.REVIEWS;
      this.AVG_REVIEW = resp.AVG_REVIEW;
      this.COUNT_REVIEW = resp.COUNT_REVIEW;
      const variedadesUnicos = new Set();
      this.product_selected.variedades = this.product_selected.variedades.filter((variedad:any) => {
        if (variedadesUnicos.has(variedad.valor)) {
          return false;
        } else {
          variedadesUnicos.add(variedad.valor);
          return true;
        }
      });

      this.selectedColor = this.product_selected.tags[0];
      
      this.variedad_selected = this.product_selected.variedades[0];
      
      this.updateFilteredGallery();

      setTimeout(() => {
        LandingProductDetail();
        this.initializeLargeSlider();
        this.initializeSmallSlider();
      }, 50);
    });
  }

  ngAfterViewInit(): void {
    this.initializeLargeSlider();
    this.initializeSmallSlider();
  }

  setActiveIndex(index: number) {
    this.activeIndex = index;
  }

  selectColor(index: number): void {
    this.selectedColor = this.product_selected.tags[index];
    this.updateFilteredGallery();
    this.reinitializeSliders();
  }

  reinitializeSliders(): void {
    this.destroyLargeSlider();
    this.destroySmallSlider();
    setTimeout(() => {
      LandingProductDetail();
      this.initializeLargeSlider();
      this.initializeSmallSlider();

    }, 50);
  }

  updateFilteredGallery(): void {
    this.filteredGallery = this.product_selected.galerias.filter(
      (item: any) => item.color === this.selectedColor
    );
  }

  initializeLargeSlider(): void {
    const largeSlider = $('.product-large-thumbnail-4');
    if ( largeSlider.hasClass('slick-initialized') ) {
      largeSlider.slick('setPosition');
    } else {
      largeSlider.slick({
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        dots: false,
        fade: true
      });
    }
  }

  destroyLargeSlider(): void {
    const largeSlider = $('.product-large-thumbnail-4');
    if (largeSlider.hasClass('slick-initialized')) {
      largeSlider.slick('unslick');
    }
  }

  initializeSmallSlider(): void {
    const smallSlider = $('.product-small-thumb-4');
    if (smallSlider.hasClass('slick-initialized')) {
      smallSlider.slick('setPosition');
    } else {
      smallSlider.slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        arrows: true,
        dots: false
      });
    }
  }

  destroySmallSlider(): void {
    const smallSlider = $('.product-small-thumb-4');
    if (smallSlider.hasClass('slick-initialized')) {
      smallSlider.slick('unslick');
    }
  }


  getColorHex(color: string): string {
    // Mapea los nombres de los colores a sus valores hexadecimales correspondientes
    const colorMap: { [key: string]: string } = {
      'Faded Black': '#424242',
      'Faded Khaki': '#dbc4a2',
      'Black': '#080808',
      'Navy': '#152438',
      'Maroon': '#6c152b',
      'Red': '#e41525',
      'Royal': '#1652ac',
      'Sport Grey': '#9b969c',
      'Light blue': '#9dbfe2',
      'Faded Eucalyptus': '#d1cbad',
      'Faded Bone': '#f3ede4',
      'White': '#ffffff',
      
      // Puedes agregar más colores aquí según sea necesario
    };

    // Devuelve el valor hexadecimal correspondiente al color
    return colorMap[color] || '';
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

  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    this.activeIndex = index;
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
      if ( !this.variedad_selected ) {
        alertDanger("Necesitas seleccinonar una variedad para el carrito...");
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
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
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
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this._cartService._authService.logout();
      }
    });
  }
}
