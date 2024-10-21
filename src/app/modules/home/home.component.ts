import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { HomeService } from './_services/home.service';
import { CartService } from '../ecommerce-guest/_service/cart.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { Subscription } from 'rxjs';
import { WishlistService } from '../ecommerce-guest/_service/wishlist.service';

declare function LandingProductDetail():any;

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function pswp([]):any;
declare function productZoom([]):any;
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

  firstImage: string = '';
  coloresDisponibles: { color: string, imagen: string }[] = [];

  variedades: any[] = [];

  errorResponse:boolean=false;
  errorMessage:any="";

  loading: boolean = false;

  //userId: any;
  CURRENT_USER_AUTHENTICATED:any=null;

  private subscription: Subscription | undefined;


  constructor(
    public homeService: HomeService,
    public _cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    public _wishlistService: WishlistService,
    //private languageService: LanguageService,
  ) { }

  private translateTextAccordingToLanguage(language: string): string {
    // Lógica para traducir el texto según el idioma
    return 'Texto traducido';
  }

  ngOnInit(): void {
   

    // Suscribirse al observable para saber cuando mostrar u ocultar el loading
    this.subscription = this.homeService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser(); // Verifica el usuario autenticado

    this.checkWindowSize();

    let TIME_NOW = new Date().getTime();
    
    this.subscription = this.homeService.listHome(TIME_NOW).subscribe((resp:any) => {
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
        this.extractTags();
      }, 150);
    });
  }

  private verifyAuthenticatedUser(): void {
    this.subscription  = this._cartService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
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

  getSwatchClass(imagen: string, color: string): any {
    return {
      'active': imagen === this.firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true
    };
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
  
  selectColor(color: { color: string, imagen: string }) {
    this.selectedColor = color.color;
    this.firstImage = color.imagen;
  }

  reinitializeSliders(): void {
    this.destroyLargeSlider();
    this.destroySmallSlider();
    setTimeout(() => {
      //LandingProductDetail();
      this.initializeLargeSlider();
      this.initializeSmallSlider();

    }, 50);
  }

  filterUniqueGalerias(product_selected:any) {
    const uniqueImages = new Set();
    this.filteredGallery = product_selected.galerias.filter((galeria:any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
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
      'Faded Bone': '#f3ede4',
      'White': '#ffffff',
      'Leaf': '#5c9346',
      'Autumn': '#c85313',
    };
    return colorMap[color] || ''; // Devuelve el valor hexadecimal correspondiente al color
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

  addCart(product:any, is_sale_flash:any=null) {
    if (!this._cartService._authService.user) {
      alertDanger("Necesitas autenticarte para poder agregar el producto al carrito");
      return;
    }
    if ($("#qty-cart").val() == 0) {
      alertDanger("Necesitas agregar una cantidad mayor a 0 para el carrito");
      return;
    }
    /*if (product.type_inventario == 2) {
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
    }*/
    
    if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
      let LINK_DISCOUNT = "";
      if (is_sale_flash) {
        LINK_DISCOUNT = "?_id="+this.FlashSale.id;
      } else { // Si el producto es de inventario unitario, se envia el producto de manera directa al carrito
        if (product.campaing_discount) {
          LINK_DISCOUNT = "?_id="+product.campaing_discount.id;
        }
      }
      this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
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

    const valoresUnitarios = ['S', 'M', 'L', 'XL'];
    const isProductUnitario = this.esProductoUnitario(product.variedades, valoresUnitarios);

    let data = {
      user: this.CURRENT_USER_AUTHENTICATED._id, //this.userId,//this._cartService._authService.user._id,
      product: product._id,
      type_discount: type_discount,
      discount: discount,
      cantidad: 1,
      variedad: isProductUnitario ? null : "multiple", //product.variedades ? product.variedades : null,
      code_cupon: null,
      code_discount: code_discount,
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscountProduct(product, is_sale_flash),  //*1,
      total: (product.price_usd - this.getDiscountProduct(product, is_sale_flash))*1, //1, // De momento es igual, luego aplicamos el descuento
    }

    this.subscription = this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto se ha agregado correctamente al cesta de compra.");
      }
    }, error => {
      console.log(error);
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        
        this._cartService._authService.logout();
      }
    });
  }

  esProductoUnitario(variedades:any, valoresUnitarios:any)  {
      for (const variedad of variedades) {
          if (valoresUnitarios.includes(variedad.valor)) {
              return false; // Si encuentra alguna de las variedades en valoresUnitarios, no es un producto unitario
          }
      }
      return true; // Si no encuentra ninguna de las variedades en valoresUnitarios, es un producto unitario
  }


  openModalToCart(besProduct:any) {
    this.product_selected = besProduct;
    setTimeout(() => {  
      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = this.product_selected.variedades.filter((item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)).sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);
      // Seleccionar automáticamente la primera talla si hay alguna disponible
      this.variedad_selected = this.variedades[0] || null;
      this.activeIndex = 0;
      this.setColoresDisponibles();
      this.selectedColor = this.coloresDisponibles[0]?.color || '';
      setTimeout(() => {
        LandingProductDetail();
        pswp($);
        productZoom($);
      }, 50);
    }, 150);
  }

  // open model
  openModal(besProduct:any, FlashSale:any=null) {
    this.product_selected = besProduct;
    setTimeout(() => {
      this.filterUniqueGalerias(this.product_selected);
      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = this.product_selected.variedades.filter((item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)).sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);
      // Seleccionar automáticamente la primera talla si hay alguna disponible
      this.variedad_selected = this.variedades[0] || null;
      this.activeIndex = 0;
      this.setColoresDisponibles();
      this.selectedColor = this.coloresDisponibles[0]?.color || '';
      setTimeout(() => {
        LandingProductDetail();
        pswp($);
        productZoom($);
      }, 50);
    }, 150);
  }


  getDiscount(FlashSale:any=null) {

    let discount = 0;
    if ( FlashSale ) {
      if (FlashSale.type_discount == 1) {
        return (FlashSale.discount*this.product_selected.price_usd*0.01).toFixed(2);
      } else {
        return FlashSale.discount;
      }
    }
    return discount;
  }

  // Wishlist
  addWishlist(product:any,  FlashSale:any=null) {

    let data: any = {};

    if( !this.CURRENT_USER_AUTHENTICATED ) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, autentifíquese para poder añadir el producto a favoritos";
      alertDanger("Por favor, autentifíquese para poder añadir el producto a favoritos");
      this._router.navigate(['/auth/login']);
      //this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
      
      return;
    }

    let variedad_selected = product.variedades.find( (v:any) => v.stock > 0 ) || null;

    data = {
      user          : this.CURRENT_USER_AUTHENTICATED._id                               ,
      product       : product._id                                                       ,
      type_discount : FlashSale ? FlashSale.type_discount : null                        ,
      discount      : FlashSale ? FlashSale.discount : 0                                ,
      cantidad      : 1                                                                 ,
      variedad      : variedad_selected ? variedad_selected.id : null                   ,
      code_cupon    : null                                                              ,
      code_discount : FlashSale ? FlashSale._id : null                                  ,
      price_unitario: product.price_usd                                                 ,
      subtotal      : product.price_usd - this.getDiscount(FlashSale)                   ,  
      total         : (product.price_usd - this.getDiscount(FlashSale))*1               , 
    }

    this.subscription = this._wishlistService.registerWishlist( data ).subscribe( ( resp:any ) => {
      
      if ( resp.message == 403 ) {
        this.errorResponse = true;
        alertDanger( resp.message_text );
        this.errorMessage = resp.message_text;
        return;
      } else {
        this._wishlistService.changeWishlist(resp.wishlist);
        //this.minicartService.openMinicart();
        // Aqui puedes decidir, si redrigir a la pangila de favoritos.
        alertSuccess( resp.message_text );
      }
    }, error => {
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this._wishlistService._authService.logout();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}