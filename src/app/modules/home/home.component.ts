import { Component, OnInit, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { HomeService } from './_services/home.service';
import { CartService } from '../ecommerce-guest/_service/cart.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { Subscription } from 'rxjs';
import { WishlistService } from '../ecommerce-guest/_service/wishlist.service';

declare var bootstrap: any;

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function LandingProductDetail($: any):any;
declare function pswp([]):any;
declare function productZoom([]):any;
declare function ModalProductDetail():any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

// ---------- Destruir desde main ----------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupProductZoom($: any): any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

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

  // Count cart & wishilist
  listCarts: any[] = [];
  totalCarts: number = 0;
  listWishlists: any = [];
  totalWishlist: number = 0;

  private discountCache = new Map<number, number>(); // Caché para almacenar descuentos calculados

  activeIndex: number = 0;

  selectedColor: string = '';

  filteredGallery: any[] = [];

  allTags: string[] = [];

  firstImage: string = '';
  coloresDisponibles: { color: string, imagen: string }[] = [];

  variedades: any[] = [];

  errorResponse:boolean=false;
  errorMessage:any="";

  loading: boolean = false;

  locale: string = "";
  country: string = "";

  //userId: any;
  CURRENT_USER_AUTHENTICATED:any=null;

  private subscription: Subscription | undefined;

  private subscriptions: Subscription = new Subscription();

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;


  constructor(
    public homeService: HomeService,
    public _cartService: CartService,
    public _router: Router,
    private activatedRoute: ActivatedRoute,
    public translate: TranslateService,
    public _wishlistService: WishlistService,
    //private languageService: LanguageService,
  ) { 
     // Obtenemos `locale` y `country` de la ruta actual
     this.activatedRoute.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    });

  }

  // private translateTextAccordingToLanguage(language: string): string {
  //   // Lógica para traducir el texto según el idioma
  //   return 'Texto traducido';
  // }

  ngAfterViewInit(): void {
    this.initializeLargeSlider();
    this.initializeSmallSlider();
  }
  

  ngOnInit(): void {
    // Suscribirse al observable para saber cuando mostrar u ocultar el loading
    this.subscription = this.homeService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.checkCookieConsent();

    this.verifyAuthenticatedUser(); // Verifica el usuario autenticado

    this.checkDeviceType();

    this.subscribeToCartData(); 

    this.subscribeToWishlistData();

    let TIME_NOW = new Date().getTime();
    
    const listHomeSubscription = this.homeService.listHome(TIME_NOW).subscribe((resp:any) => {
      this.ourProducts = resp.our_products.map((product: any) => {
        product.finalPrice = this.calculateFinalPrice(product); // Asignamos el precio final con descuento
        return product;
      });

      this.sliders = resp.sliders;
      this.categories = resp.categories;
      console.log("Categoriaas desde la home: ", this.categories);
      // Generar slug para cada categoría sin modificar el título original
      this.categories.forEach((category:any) => {
        category.slug = this.generateSlug(category.title);  // Genera el slug y lo agrega al objeto categoria
      });
      
      this.ourProducts = resp.our_products;
      this.besProducts = resp.bes_products;
      this.FlashSale = resp.FlashSale;
      this.FlashProductList = resp.campaign_products;

      if (this.ourProducts || this.besProducts) {
        this.setColoresDisponibles();
      }

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

    //this.extractTags();
    this.subscription?.add(listHomeSubscription);
  }

  checkCookieConsent(): void {
    const isCookieAccepted = localStorage.getItem('cookieAccepted');
    if (!isCookieAccepted) {
      const modalElement = document.getElementById('newsletter_modal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()                  // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '')     // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-')            // Reemplazar los espacios por guiones
      .replace(/-+/g, '-');            // Reemplazar múltiples guiones por uno solo
  }

  acceptCookies(): void {
    localStorage.setItem('cookieAccepted', 'true');
    const modalElement = document.getElementById('newsletter_modal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  calculateFinalPrice(product: any): number {
    let discount = 0;
  
    if (this.FlashSale && this.FlashSale.type_discount) {
      // Aplicar descuento de Flash Sale
      if (this.FlashSale.type_discount === 1) {
        discount = product.price_usd * this.FlashSale.discount * 0.01;
      } else if (this.FlashSale.type_discount === 2) {
        discount = this.FlashSale.discount;
      }
    } else if (product.campaing_discount) {
      // Aplicar descuento de campaña si no hay Flash Sale
      if (product.campaing_discount.type_discount === 1) {
        discount = product.price_usd * product.campaing_discount.discount * 0.01;
      } else if (product.campaing_discount.type_discount === 2) {
        discount = product.campaing_discount.discount;
      }
    }
  
    return parseFloat((product.price_usd - discount).toFixed(2));
  }
  
  private checkDeviceType() {
    const width = window.innerWidth;
    if (width <= 480) {
      this.isMobile = true;
      this.isTablet = false;
      this.isDesktop = false;
    } else if (width > 480 && width <= 768) {
      this.isMobile = false;
      this.isTablet = true;
      this.isDesktop = false;
    } else {
      this.isMobile = false;
      this.isTablet = false;
      this.isDesktop = true;
    }
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

  navigateToProduct(slug: string, discountId?: string) {
    // Guarda el estado para hacer scroll hacia arriba
    sessionStorage.setItem('scrollToTop', 'true');
    // Navega a la página del producto
    this._router.navigate(['/', this.locale, this.country, 'shop', 'product', slug])
    //this._router.navigate(['/product', slug], { queryParams: { _id: discountId } })
      .then(() => {
          // Recarga la página
          window.location.reload();
      });
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

  getSwatchClass(imagen: string, color: string): any {
    return {
      'active': imagen === this.firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true
    };
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
  
  qselectColor(color: { color: string, imagen: string }) {
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

  selectColor(color: { color: string, imagen: string }) {
    this.selectedColor = color.color;
    this.firstImage = color.imagen; 
  }

  changeProductImage(product: any, imageUrl: string) {
    product.imagen = imageUrl; // console.log("Selectre Image: ", product);
  }

  setColoresDisponibles() {
    this.ourProducts.forEach((product: any) => {
      const uniqueColors = new Map();
      product.galerias.forEach((tag: any) => {
        if (!uniqueColors.has(tag.color)) {
          uniqueColors.set(tag.color, { imagen: tag.imagen, hex: this.getColorHex(tag.color) });
        }
      });
  
      // Agrega los colores únicos de cada producto al propio producto
      product.colores = Array.from(uniqueColors, ([color, { imagen, hex }]) => ({ color, imagen, hex }));

      // Agregar propiedad `selectedImage` con la imagen principal del producto
      product.imagen = product.imagen;
    });

    this.besProducts.forEach((product: any) => {
      const uniqueColors = new Map();
      product.galerias.forEach((tag: any) => {
        if (!uniqueColors.has(tag.color)) {
          uniqueColors.set(tag.color, { imagen: tag.imagen, hex: this.getColorHex(tag.color) });
        }
      });
  
      // Agrega los colores únicos de cada producto al propio producto
      product.colores = Array.from(uniqueColors, ([color, { imagen, hex }]) => ({ color, imagen, hex }));

      // Agregar propiedad `selectedImage` con la imagen principal del producto
      product.imagen = product.imagen;
    });
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

  getDiscountProduct(besProduct: any): number {
    // Verificar si ya tenemos el descuento calculado en el caché
    if (this.discountCache.has(besProduct.id)) {
      return this.discountCache.get(besProduct.id)!;
    }
  
    let discount = 0;
  
    // Aplicar descuento de venta flash si existe
    if (this.FlashSale && this.FlashSale.type_discount) {
      if (this.FlashSale.type_discount === 1) { // Descuento en porcentaje
        discount = parseFloat((besProduct.price_usd * this.FlashSale.discount * 0.01).toFixed(2));
      } else if (this.FlashSale.type_discount === 2) { // Descuento en valor
        discount = this.FlashSale.discount;
      }
    } else if (besProduct.campaing_discount) { // Aplicar descuento de campaña si no hay FlashSale
      if (besProduct.campaing_discount.type_discount === 1) { // Descuento en porcentaje
        discount = parseFloat((besProduct.price_usd * besProduct.campaing_discount.discount * 0.01).toFixed(2));
      } else if (besProduct.campaing_discount.type_discount === 2) { // Descuento en valor
        discount = besProduct.campaing_discount.discount;
      }
    }
  
    // Almacenar el resultado en el caché
    this.discountCache.set(besProduct.id, discount);
  
    return discount;
  }

  /*getDiscountProduct(besProduct:any, is_sale_flash:any=null) {
    if (is_sale_flash) {
      //console.log("---- getDiscountProduct");
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
  }*/

  getRouterDiscount(besProduct:any) {
    if (besProduct.campaing_discount) {
      return {_id: besProduct.campaing_discount._id};
    }
    return {};
  }

  //addCart(product:any, is_sale_flash:any=null) {
  addCart(product:any) {
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
      //if (is_sale_flash) {
      if (this.FlashSale && this.FlashSale.type_discount) {
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
    //if (is_sale_flash) {
    if (this.FlashSale && this.FlashSale.type_discount) {
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
      subtotal: product.price_usd - this.getDiscountProduct(product),//this.getDiscountProduct(product, is_sale_flash),  //*1,
      total: (product.price_usd - this.getDiscountProduct(product))*1, //1, // De momento es igual, luego aplicamos el descuento
    }

    console.log("----- data: ", data);
    

    const cartSubscription = this._cartService.registerCart(data).subscribe((resp:any) => {
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

    this.subscription?.add(cartSubscription);
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
        //LandingProductDetail($);
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
        //LandingProductDetail($);
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
      alertSuccess("Autentifíquese para poder añadir el producto a favoritos");
      this._router.navigate(['/', this.locale, this.country, 'auth', 'login']);
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

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkDeviceType(); // Vuelve a verificar el tamaño en caso de cambio de tamaño de pantalla
  }

  private cleanupPSWP() {
    // Limpiar los eventos asignados por pswp()
    $('.prlightbox').off('click');

    // Si PhotoSwipe está activo o existe algún lightbox abierto, ciérralo
    const pswpElement = $('.pswp')[0];

    // Hacemos un casting explícito para acceder a PhotoSwipe y PhotoSwipeUI_Default en window
    const PhotoSwipe = (window as any).PhotoSwipe;
    const PhotoSwipeUI_Default = (window as any).PhotoSwipeUI_Default;

    if (pswpElement && typeof PhotoSwipe !== 'undefined') {
      let lightBox = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, [], {});
      
      // Si el lightBox está abierto, ciérralo
      if (lightBox) {
        lightBox.close();
      }
    }
  }

  private subscribeToCartData(): void {
    this.subscriptions.add(
      this._cartService.currenteDataCart$.subscribe((resp: any) => {
        this.listCarts = resp;
        this.totalCarts = this.listCarts.reduce((sum, item) => sum + parseFloat(item.total), 0);
      })
    );
  }

  private subscribeToWishlistData(): void {
    this.subscriptions.add(
      this._wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
        this.listWishlists = resp;
        this.totalWishlist = this.listWishlists.reduce((sum:any, item:any) => sum + parseFloat(item.total), 0);
      })
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }

    cleanupHOMEINITTEMPLATE($);
    cleanupProductZoom($);
    this.cleanupPSWP();
  }
}