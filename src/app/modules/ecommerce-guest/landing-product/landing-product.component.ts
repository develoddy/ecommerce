import { AfterViewInit, Component, OnInit } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../_service/cart.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function pswp([]):any;
declare function productZoom([]):any;


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
export class LandingProductComponent implements OnInit/*, AfterViewInit*/ {

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
  uniqueGalerias: any[] = [];
  firstImage: string = '';
  coloresDisponibles: { color: string, imagen: string }[] = [];
  variedades: any[] = [];

  constructor(
    public _ecommerce_guestService: EcommerceGuestService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public _cartService: CartService,
  ) {}

  ngOnInit(): void {

    //this.reloadPage();
    
    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
    });
    this._routerActived.queryParams.subscribe((resp:any) => {
      this.discount_id = resp["_id"];
    });
    this._ecommerce_guestService.showLandingProduct(this.slug, this.discount_id).subscribe((resp:any) => {
      this.product_selected = resp.product;
      console.log("___DEBBUG: ", this.product_selected);
      this.related_products = resp.related_products;
      this.SALE_FLASH = resp.SALE_FLASH;
      this.REVIEWS = resp.REVIEWS;
      this.AVG_REVIEW = resp.AVG_REVIEW;
      this.COUNT_REVIEW = resp.COUNT_REVIEW;

      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = resp.product.variedades.filter((item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)).sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1); // Ordenar por valor de menor a mayor
      
      // Seleccionar automáticamente la primera talla si hay alguna disponible
      this.variedad_selected = this.variedades[0] || null;
      this.activeIndex = 0;

      this.filterUniqueGalerias();
      this.setFirstImage();
      this.setColoresDisponibles();

      this.selectedColor = this.coloresDisponibles[0]?.color || '';
      //this.reloadPage();
        setTimeout(() => {
          HOMEINITTEMPLATE($);
          pswp($);
          productZoom($);
          
        }, 50);
    });    
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
  
  filterUniqueGalerias() {
    const uniqueImages = new Set();
    this.uniqueGalerias = this.product_selected.galerias.filter((galeria:any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
  }

  setFirstImage() {
    if (this.uniqueGalerias.length > 0) {
      this.firstImage = this.uniqueGalerias[0].imagen;
    }
  }

  setColoresDisponibles() {
    const uniqueColors = new Map();
    this.product_selected.galerias.forEach((galeria: any) => {
      if (!uniqueColors.has(galeria.color)) {
        uniqueColors.set(galeria.color, { imagen: galeria.imagen, hex: this.getColorHex(galeria.color) });
      }
    });
    this.coloresDisponibles = Array.from(uniqueColors, ([color, { imagen, hex }]) => ({ color, imagen, hex }));
  }

  updateZoomImage(newImage: string) {
    this.firstImage = newImage;
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
      'Leaf': '#5c9346',
      'Autumn': '#c85313',
    };
    return colorMap[color] || ''; // Devuelve el valor hexadecimal correspondiente al color
  }

  getSwatchClass(imagen: string, color: string): any {
    return {
      'active': imagen === this.firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true
    };
  }

  setActiveIndex(index: number) {
    this.activeIndex = index;
  }

  selectColor(color: { color: string, imagen: string }) {
    this.selectedColor = color.color;
    this.firstImage = color.imagen;
    // console.log(`Color seleccionado: ${this.selectedColor}`);
  }

  selectedVariedad(variedad:any, index: number) {
    //console.log(`Variedad antes de la actualización: ${this.variedad_selected?.valor}`);
    this.variedad_selected = variedad;
    this.activeIndex = index;
    console.log(`Talla seleccionada: ${this.variedad_selected.valor}`);
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

  addCart(product:any) {

    
    if ( !this._cartService._authService.user ) {
      alertDanger("Por favor, autentifíquese para poder añadir el producto a la cesta.");
      return;
    }
    if ( $("#qty-cart").val() == 0 ) {
      alertDanger("Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta.");
      return;
    }
  
    if ( this.product_selected.type_inventario == 2 ) {
      if ( !this.variedad_selected ) {
        alertDanger("Por favor, seleccione una variedad antes de añadir a la cesta.");
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          alertDanger("Por favor, reduzca la cantidad. Stock insuficiente.");
          return;
        }
      }
    }
    
    console.log("Debugg: cantidad: ", product,  this.variedad_selected, $("#qty-cart").val());
    //return;

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
        alertSuccess("El producto ha sido añadido correctamente a la cesta.")
      }
    }, error => {
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this._cartService._authService.logout();
      }
    });
  }
}
