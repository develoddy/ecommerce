import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { HomeService } from './_services/home.service';
import { CartService } from '../ecommerce-guest/_service/cart.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { Subscription } from 'rxjs';

declare function LandingProductDetail():any;

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
export class HomeComponent implements OnInit, AfterViewInit {

  euro = "€";
  sliders:any = [];
  categories:any = [];
  besProducts:any = [];
  ourProducts:any = [];
  product_selected:any=null;
  FlashSale:any = null;
  FlashProductList:any = [];
  variedad_selected:any=null;
  translatedText: string = "";
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  //private subscription: Subscription;
  REVIEWS:any=null;

  activeIndex: number = 0;

  selectedColor: string = '';

  filteredGallery: any[] = [];

  allTags: string[] = [];

  isDesktopSize: boolean = window.innerWidth >= 992; // Inicialización

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


  ngOnInit(): void {
    this.checkWindowSize();

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
        HOMEINITTEMPLATE($);
        LandingProductDetail();

        //this.initializeLargeSlider();
        //this.initializeSmallSlider();
        
        this.extractTags();
      }, 50);
    });
  }

  ngAfterViewInit(): void {
    this.initializeLargeSlider();
    this.initializeSmallSlider();
  }

  sizesUnicos( product_selected:any ) {
    const variedadesUnicos = new Set();
    product_selected.variedades = product_selected.variedades.filter((variedad:any) => {
      if (variedadesUnicos.has(variedad.valor)) {
        return false;
      } else {
        variedadesUnicos.add(variedad.valor);
        return true;
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkWindowSize();
  }

  checkWindowSize() {
    this.isDesktopSize = window.innerWidth >= 992;
  }

  isDesktop(): boolean {
    return this.isDesktopSize;
  }

  extractTags() {
    this.besProducts.forEach((product: any) => {
      if (product.tags && product.tags.length > 0) {
        // Filtrar colores únicos del producto actual
        const uniqueTags = product.tags.filter((tag: string, index: number, self: string[]) => {
          return self.indexOf(tag) === index;
        });
  
        this.allTags.push(uniqueTags); // Agregar los colores únicos del producto a allTags
      }
    });
  
    // Seleccionar el primer color de la primera iteración para el color seleccionado inicialmente
    if (this.allTags.length > 0) {
      this.selectedColor = this.allTags[0][0]; // Seleccionar el primer color del primer producto
    }
  }
    

  openModal(besProduct:any, FlashSale:any=null) {
    this.product_selected = null;

    setTimeout(() => {
      this.product_selected = besProduct;
      
      this.sizesUnicos( this.product_selected );
      this.selectedColor = this.product_selected.tags[0];
      this.variedad_selected = this.product_selected.variedades[0];
      this.product_selected.FlashSale = FlashSale;

      this.updateFilteredGallery(this.product_selected);
      this.reinitializeSliders();

      setTimeout(() => {
        LandingProductDetail();
        ModalProductDetail();
        this.updateFilteredGallery(this.product_selected);
        this.initializeLargeSlider();
        this.initializeSmallSlider();
      }, 50);
    }, 150);
  }

  selectColor(index: number): void {
    this.selectedColor = this.product_selected.tags[index];
    console.log("this.selectedColor: ", this.selectedColor );
    this.updateFilteredGallery(this.product_selected);
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

  updateFilteredGallery(product_selected:any): void {
    console.log("___FRONT updateFilteredGallery", product_selected);
    
    this.filteredGallery = product_selected.galerias.filter(
      (item: any) => item.color === this.selectedColor
    );
  }
  
  initializeLargeSlider(): void {
    const largeSlider = $('.single-product-thumbnail');
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
    const largeSlider = $('.single-product-thumbnail');
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
      // Puedes agregar más colores aquí según sea necesario
    };

    // Devuelve el valor hexadecimal correspondiente al color
    return colorMap[color] || '';
  }

  getCalNewPrice(product:any) {
    if (this.FlashSale.type_discount == 1) { // Por porcentaje
      // Round to 2 decimal places
      return (product.price_usd - product.price_usd*this.FlashSale.discount*0.01).toFixed(2);
    } else { // Port moneda
      return product.price_usd - this.FlashSale.discount;
    }
  }

  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    console.log("this.variedad_selected: ", this.variedad_selected);
    
    this.activeIndex = index;
  }

  setActiveIndex(index: number) {
    this.activeIndex = index;
  }

  getDiscountProduct(besProduct:any, is_sale_flash:any=null) {
    if (is_sale_flash) {
      if (this.FlashSale.type_discount == 1) { // 1 porcentaje
        return (besProduct.price_usd*this.FlashSale.discount*0.01).toFixed(2);
      } else { // 2 es moneda
        return this.FlashSale.discount;
      }
    } else {
      if (besProduct.campaing_discount) {
        if (besProduct.campaing_discount.type_discount == 1) { // 1 porcentaje
          //return besProduct.price_usd*besProduct.campaing_discount.discount*0.01;
          return (besProduct.price_usd*besProduct.campaing_discount.discount*0.01).toFixed(2);
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

  //...
  //...
  // VerificaR!

  addCart(product:any, is_sale_flash:any=null) {
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
    
    if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
      let LINK_DISCOUNT = "";
      if (is_sale_flash) {
        LINK_DISCOUNT = "?_id="+this.FlashSale.id;
      } else { // Si el producto es de inventario unitario, se envia el producto de manera directa al carrito
        if (product.campaing_discount) {
          LINK_DISCOUNT = "?_id="+product.campaing_discount.id;
        }
      }
      //this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
      //return;
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
      cantidad: $("#qty-cart").val(), //1,
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: code_discount,
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscountProduct(product, is_sale_flash),  //*1,
      total: (product.price_usd - this.getDiscountProduct(product, is_sale_flash))* $("#qty-cart").val(), //1, // De momento es igual, luego aplicamos el descuento
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
        
        this._cartService._authService.logout();
      }
    });
  }
}
