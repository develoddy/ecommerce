import {
  Component,
  OnInit,
  HostListener,
  AfterViewInit,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { HomeService } from './_services/home.service';
import { CartService } from '../ecommerce-guest/_service/cart.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { combineLatest, Subscription, take } from 'rxjs';
import { WishlistService } from '../ecommerce-guest/_service/wishlist.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { AuthService } from '../auth-profile/_services/auth.service';
import { MinicartService } from 'src/app/services/minicartService.service';
import { SeoService } from 'src/app/services/seo.service';
import { CookieConsentService } from 'src/app/services/cookie-consent.service';
import { LoaderService } from 'src/app/services/loader.service';
import { PriceCalculationService } from 'src/app/services/product/price-calculation.service';
import { FlashSaleTimerService, TimeLeft } from 'src/app/services/product/flash-sale-timer.service';
import { URL_FRONTEND } from 'src/app/config/config';

declare var bootstrap: any;
declare var $: any;
declare function HOMEINITTEMPLATE([]): any;
declare function productSlider5items($: any): any;
declare function LandingProductDetail($: any): any;
declare function pswp([]): any;
declare function productZoom([]): any;
declare function ModalProductDetail(): any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;

// ---------- Destruir desde main ----------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupProductZoom($: any): any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  euro = '€';
  currentUrl: string = window.location.href;
  sliders: any = [];
  categories: any = [];
  SALE_FLASH: any = null;
  besProducts: any = [];
  ourProducts: any = [];
  product_selected: any = null;
  FlashSales: any = null;
  FlashProductList: any = [];
  variedad_selected: any = null;
  translatedText: string = '';
  AVG_REVIEW: any = null;
  COUNT_REVIEW: any = null;
  REVIEWS: any = null;
  listCarts: any[] = [];
  totalCarts: number = 0;
  listWishlists: any = [];
  totalWishlist: number = 0;
  private discountCache = new Map<number, number>();
  activeIndex: number = 0;
  selectedColor: string = '';
  filteredGallery: any[] = [];
  allTags: string[] = [];
  firstImage: string = '';
  coloresDisponibles: { color: string; imagen: string }[] = [];
  variedades: any[] = [];
  errorResponse: boolean = false;
  errorMessage: any = '';
  // isLoading flag removed: using LoaderService.loading$ in template via async pipe
  locale: string = '';
  country: string = '';
  CURRENT_USER_AUTHENTICATED: any = null;
  CURRENT_USER_GUEST: any = null;
  currentUser: any = null;
  private subscription: Subscription | undefined;
  private subscriptions: Subscription = new Subscription();
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  tallaError = false;
  cantidadError = false;
  private modalInstance: any;
  timeLeft: { [flashId: string]: TimeLeft } = {};
  private timerInterval: any;
  
  constructor(
    public homeService: HomeService,
    public _cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    public _wishlistService: WishlistService,
    public _authService: AuthService,
    private localizationService: LocalizationService,
    private minicartService: MinicartService,
    private seoService: SeoService,
    public loader: LoaderService,
    private priceCalculationService: PriceCalculationService,
    private flashSaleTimerService: FlashSaleTimerService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngAfterViewInit(): void {
    this.initializeLargeSlider();
    this.initializeSmallSlider();
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.initializeHomeData();
    this.initializePostLoadTasks();
  }

  private initializeComponent(): void {
    this.setupSEO();
    this.verifyAuthenticatedUser();
    this.checkDeviceType();
    this.subscribeToCartData();
    this.subscribeToWishlistData();
  }

  private initializeHomeData(): void {
    const TIME_NOW = new Date().getTime();

    const listHomeSubscription = this.homeService.listHome(TIME_NOW).subscribe((resp: any) => {
      this.processBasicData(resp);
      this.processProductPrices(resp);
      this.finalizeDataProcessing();
    });

    this.subscriptions.add(listHomeSubscription);
  }

  private processBasicData(resp: any): void {
    // Asignar datos básicos primero
    this.sliders = resp.sliders.filter((slider: any) => slider.state == 1);
    this.categories = resp.categories;
    this.FlashSales = resp.FlashSales;
    this.FlashProductList = resp.campaign_products;
    this.besProducts = resp.bes_products;
    
    // Generar slug para cada categoría sin modificar el título original
    this.categories.forEach((category: any) => {
      category.slug = this.generateSlug(category.title); 
    });
  }

  private processProductPrices(resp: any): void {
    // Calcular precios finales para productos normales usando el servicio
    this.ourProducts = resp.our_products.map((product: any) => {
      product.finalPrice = this.priceCalculationService.calculateFinalPrice(product, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(product.finalPrice);
      product.priceInteger = priceParts.integer;
      product.priceDecimals = priceParts.decimals;
      return product;
    });

    // Calcular precios finales para productos de Flash Sale usando el servicio
    this.FlashProductList = this.FlashProductList.map((flashProduct: any) => {
      flashProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(flashProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(flashProduct.finalPrice);
      flashProduct.priceInteger = priceParts.integer;
      flashProduct.priceDecimals = priceParts.decimals;
      
      return flashProduct;
    });
  }

  private finalizeDataProcessing(): void {
    if (this.ourProducts || this.besProducts) {
      this.setColoresDisponibles();
    }

    this.setFirstImage();
    this.setColoresDisponibles();
  }

  private initializePostLoadTasks(): void {
    // Subscribe to loader to initialize sliders after HTTP calls complete
    this.subscriptions.add(
      this.loader.loading$.subscribe((isLoading) => {
        if (!isLoading) {
          setTimeout(() => {
            this.setupFlashSaleTimers();
            this.initializeUIComponents();
          }, 150);
        } else {
          this.cleanupUIComponents();
        }
      })
    );
  }

  private setupFlashSaleTimers(): void {
    // Inicializar timers de Flash Sales usando el servicio
    if (this.FlashSales && this.FlashSales.length) {
      this.subscriptions.add(
        this.flashSaleTimerService.initializeTimers(this.FlashSales).subscribe(
          (timersData) => {
            this.timeLeft = timersData;
          }
        )
      );
    }
  }

  private initializeUIComponents(): void {
    HOMEINITTEMPLATE($);
    productSlider5items($);
    (window as any).sliderRefresh($);
    this.extractTags();
  }

  private cleanupUIComponents(): void {
    cleanupHOMEINITTEMPLATE($);
    cleanupProductZoom($);
  }

  setupSEO() {
    this.seoService.updateSeo({
      title: 'Camisetas para Programadores | Tienda Lujandev',
      description:
        'Camisetas para Programadores | Tienda Lujandev | LujanDev Oficial',
      image: `${URL_FRONTEND.replace(/\/$/, '')}/assets/images/logo.png`,
    });
  }

  getPriceParts = (price: number) => {
    if (!this.priceCalculationService) {
      console.warn('PriceCalculationService not available');
      return { integer: '0', decimal: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
  }

 
  generateSlug(title: string): string {
    return title
      .toLowerCase() // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '') // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-') // Reemplazar los espacios por guiones
      .replace(/-+/g, '-'); // Reemplazar múltiples guiones por uno solo
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
    // Asignación inicial síncrona desde localStorage para disponibilidad inmediata
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.CURRENT_USER_AUTHENTICATED = user;
      this.currentUser = user;
    } else {
      const storedGuest = localStorage.getItem('user_guest');
      if (storedGuest) {
        const guest = JSON.parse(storedGuest);
        this.CURRENT_USER_GUEST = guest;
        this.currentUser = guest;
      }
    }
    // Suscribirse para futuras actualizaciones desde AuthService
    this.subscriptions.add(
      combineLatest([
        this._authService.user,
        this._authService.userGuest,
      ]).subscribe(([user, guestUser]) => {
        if (user) {
          this.CURRENT_USER_AUTHENTICATED = user;
          this.CURRENT_USER_GUEST = null;
          this.currentUser = user;
        } else if (guestUser && guestUser.state === 1) {
          this.CURRENT_USER_AUTHENTICATED = null;
          this.CURRENT_USER_GUEST = guestUser;
          this.currentUser = guestUser;
        } else {
          this.CURRENT_USER_AUTHENTICATED = null;
          this.CURRENT_USER_GUEST = null;
          this.currentUser = null;
        }
      })
    );
  }

  navigateToProduct = (slug: string, discountId?: string) => {
    sessionStorage.setItem('scrollToTop', 'true');
    this._router
      .navigate(['/', this.locale, this.country, 'shop', 'product', slug])
      .then(() => {
        window.location.reload();
      });
  };

  sizesUnicos(product_selected: any) {
    const variedadesUnicos = new Set();
    product_selected.variedades = product_selected.variedades.filter(
      (variedad: any) => {
        if (variedadesUnicos.has(variedad.valor)) {
          return false;
        } else {
          variedadesUnicos.add(variedad.valor);
          return true;
        }
      }
    );
  }

  getSwatchClass(imagen: string, color: string): any {
    return {
      active: imagen === this.firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true,
    };
  }

  extractTags() {
    this.besProducts.forEach((product: any) => {
      if (product.tags && product.tags.length > 0) {
        // Filtrar colores únicos del producto actual
        const uniqueTags = product.tags.filter(
          (tag: string, index: number, self: string[]) => {
            return self.indexOf(tag) === index;
          }
        );

        this.allTags.push(uniqueTags);
      }
    });

    // Seleccionar el primer color de la primera iteración para el color seleccionado inicialmente
    if (this.allTags.length > 0) {
      this.selectedColor = this.allTags[0][0];
    }
  }

  reinitializeSliders(): void {
    this.destroyLargeSlider();
    this.destroySmallSlider();
    setTimeout(() => {
      this.initializeLargeSlider();
      this.initializeSmallSlider();
    }, 50);
  }

  filterUniqueGalerias(product_selected: any) {
    const uniqueImages = new Set();
    this.filteredGallery = product_selected.galerias.filter((galeria: any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
  }

  setFirstImage() {
    if (this.filteredGallery.length > 0) {
      this.firstImage = this.filteredGallery[0].imagen;
    }
  }

  selectColor(color: { color: string; imagen: string }) {
    this.selectedColor = color.color;
    this.firstImage = color.imagen;
  }

  changeImage(imagen: string) {
    this.firstImage = imagen;
  }

  initializeLargeSlider(): void {
    const largeSlider = $('.single-product-thumbnail');
    if (largeSlider.hasClass('slick-initialized')) {
      largeSlider.slick('setPosition');
    } else {
      largeSlider.slick({
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        dots: false,
        fade: true,
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
        dots: false,
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
      // Sudaderas premiun con capucha unisex | Cotton Heritage M2580
      'Carbon Grey': '#c7c3be',
      'Bone': '#f5e8ce',
    };
    return colorMap[color] || ''; // Devuelve el valor hexadecimal correspondiente al color
  }

  changeProductImage(product: any, imageUrl: string) {
    product.imagen = imageUrl;
  }

  setColoresDisponibles() {
    this.ourProducts.forEach((product: any) => {
      const uniqueColors = new Map();
      product.galerias.forEach((tag: any) => {
        
        if (!uniqueColors.has(tag.color)) {
          uniqueColors.set(tag.color, {
            imagen: tag.imagen,
            hex: this.getColorHex(tag.color),
          });
        }
      });

      // Agrega los colores únicos de cada producto al propio producto
      product.colores = Array.from(
        uniqueColors,
        ([color, { imagen, hex }]) => ({ color, imagen, hex })
      );

      // Agregar propiedad `selectedImage` con la imagen principal del producto
      product.imagen = product.imagen;
    });

    this.besProducts.forEach((product: any) => {
      const uniqueColors = new Map();
      product.galerias.forEach((tag: any) => {
        if (!uniqueColors.has(tag.color)) {
          uniqueColors.set(tag.color, {
            imagen: tag.imagen,
            hex: this.getColorHex(tag.color),
          });
        }
      });

      // Agrega los colores únicos de cada producto al propio producto
      product.colores = Array.from(
        uniqueColors,
        ([color, { imagen, hex }]) => ({ color, imagen, hex })
      );

      // Agregar propiedad `selectedImage` con la imagen principal del producto
      product.imagen = product.imagen;
    });

    this.FlashProductList.forEach((product: any) => {
       const uniqueColors = new Map();
       product.galerias.forEach((tag: any) => {
         if (!uniqueColors.has(tag.color)) {
           uniqueColors.set(tag.color, {
             imagen: tag.imagen,
             hex: this.getColorHex(tag.color),
           });
         }
       });

       // Agrega los colores únicos de cada producto al propio producto
       product.colores = Array.from(
         uniqueColors,
         ([color, { imagen, hex }]) => ({ color, imagen, hex })
       );

       // Agregar propiedad `selectedImage` con la imagen principal del producto
       product.imagen = product.imagen;
     });
  }

  getCalNewPrice(product: any): number {
    return this.priceCalculationService.calculateFinalPrice(product, this.FlashSales);
  }

  selectedVariedad(variedad: any, index: number) {
    this.variedad_selected = variedad;
    this.activeIndex = index;
  }

  setActiveIndex(index: number) {
    this.activeIndex = index;
  }

  getDiscountProduct(besProduct: any): number {
    // Verificar caché
    if (this.discountCache.has(besProduct.id)) {
      return this.discountCache.get(besProduct.id)!;
    }

    const discount = this.priceCalculationService.getDiscountAmount(besProduct, this.FlashSales);

    // Guardar en caché
    this.discountCache.set(besProduct.id, discount);

    return discount;
  }

  // getDiscountProduct(besProduct: any): number {
  //   // Verificar si ya tenemos el descuento calculado en el caché
  //   if (this.discountCache.has(besProduct.id)) {
  //     return this.discountCache.get(besProduct.id)!;
  //   }

  //   let discount = 0;

  //   // Aplicar descuento de venta flash si existe
  //   if (this.FlashSale && this.FlashSale.type_discount) {
  //     if (this.FlashSale.type_discount === 1) {
  //       // Descuento en porcentaje
  //       discount = parseFloat(
  //         (besProduct.price_usd * this.FlashSale.discount * 0.01).toFixed(2)
  //       );
  //     } else if (this.FlashSale.type_discount === 2) {
  //       // Descuento en valor
  //       discount = this.FlashSale.discount;
  //     }
  //   } else if (besProduct.campaing_discount) {
  //     // Aplicar descuento de campaña si no hay FlashSale
  //     if (besProduct.campaing_discount.type_discount === 1) {
  //       // Descuento en porcentaje
  //       discount = parseFloat(
  //         (
  //           besProduct.price_usd *
  //           besProduct.campaing_discount.discount *
  //           0.01
  //         ).toFixed(2)
  //       );
  //     } else if (besProduct.campaing_discount.type_discount === 2) {
  //       // Descuento en valor
  //       discount = besProduct.campaing_discount.discount;
  //     }
  //   }

  //   // Almacenar el resultado en el caché
  //   this.discountCache.set(besProduct.id, discount);

  //   return discount;
  // }

  getRouterDiscount(besProduct: any) {
    if (besProduct.campaing_discount) {
      return { _id: besProduct.campaing_discount._id };
    }
    return {};
  }

  // addCart(product:any) {
  //   if (!this._cartService._authService.user) {
  //     alertDanger("Necesitas autenticarte para poder agregar el producto al carrito");
  //     return;
  //   }

  //   if ($("#qty-cart").val() == 0) {
  //     alertDanger("Necesitas agregar una cantidad mayor a 0 para el carrito");
  //     return;
  //   }
  //   //if (product.type_inventario == 2) {
  //   //  if ( !this.variedad_selected ) {
  //   //    alertDanger("Necesitas seleccinonar una variedad para el carrito...");
  //   //    return;
  //   //  }
  //   //  if (this.variedad_selected) {
  //   //    if (this.variedad_selected.stock < $("#qty-cart").val()) {
  //   //      alertDanger("Necesitas agregar una cantidad menor porque no se tiene el stock suficiente");
  //   //      return;
  //   //    }
  //   //  }
  //   //}

  //   if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
  //     let LINK_DISCOUNT = "";
  //     if (this.FlashSale && this.FlashSale.type_discount) {
  //       LINK_DISCOUNT = "?_id="+this.FlashSale.id;
  //     } else { // Si el producto es de inventario unitario, se envia el producto de manera directa al carrito
  //       if (product.campaing_discount) {
  //         LINK_DISCOUNT = "?_id="+product.campaing_discount.id;
  //       }
  //     }
  //     this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
  //   }

  //   let type_discount = null;
  //   let discount = 0;
  //   let code_discount = null;
  //   if (this.FlashSale && this.FlashSale.type_discount) {
  //     type_discount = this.FlashSale.type_discount;
  //     discount = this.FlashSale.discount;
  //     code_discount = this.FlashSale._id;
  //   } else {
  //     if (product.campaing_discount) {
  //       type_discount  = product.campaing_discount.type_discount;
  //       discount = product.campaing_discount.discount;
  //       code_discount = product.campaing_discount._id;
  //     }
  //   }

  //   const valoresUnitarios = ['S', 'M', 'L', 'XL'];
  //   const isProductUnitario = this.esProductoUnitario(product.variedades, valoresUnitarios);

  //   let data = {
  //     user: this.CURRENT_USER_AUTHENTICATED._id,
  //     product: product._id,
  //     type_discount: type_discount,
  //     discount: discount,
  //     cantidad: 1,
  //     variedad: isProductUnitario ? null : "multiple",
  //     code_cupon: null,
  //     code_discount: code_discount,
  //     price_unitario: product.price_usd,
  //     subtotal: product.price_usd - this.getDiscountProduct(product),
  //     total: (product.price_usd - this.getDiscountProduct(product))*1,
  //   }

  //   const cartSubscription = this._cartService.registerCart(data).subscribe((resp:any) => {
  //     if (resp.message == 403) {
  //       alertDanger(resp.message_text);
  //         return;
  //     } else {
  //       this._cartService.changeCart(resp.cart);
  //       alertSuccess("El producto se ha agregado correctamente al cesta de compra.");
  //     }
  //   }, error => {
  //     console.log(error);
  //     if (error.error.message == "EL TOKEN NO ES VALIDO") {

  //       this._cartService._authService.logout();
  //     }
  //   });

  //   this.subscription?.add(cartSubscription);
  // }

  storeCart(product: any) {
    this.saveCart(product);
  }

  private saveCart(product: any) {
    if ($('#qty-cart').val() == 0) {
      this.errorResponse = true;
      this.errorMessage = 'Elija una cantidad válida para añadir al carrito';
      this.cantidadError = true;
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if (!this.variedad_selected) {
        this.tallaError = true; // Establecer el error de talla
        this.errorResponse = true;
        this.errorMessage = 'Por favor seleccione una talla';
        return;
      }
      if (this.variedad_selected.stock < $('#qty-cart').val()) {
        this.errorResponse = true;
        this.errorMessage =
          'La Cantidad excede el stock disponible. Elija menos unidades';
        this.cantidadError = true;
        return;
      }
    }

    let data = {
      user: this.currentUser.email ? this.currentUser._id : this.currentUser.id,
      user_status: this.currentUser.email ? null : 'guest',
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: parseInt($('#qty-cart').val() as string, 10), //cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),
      total:
        (this.product_selected.price_usd - this.getDiscount()) *
        $('#qty-cart').val(),
    };

    if (this.currentUser && !this.currentUser.email) {
      //if (this.currentUser.user_guest == "Guest") {
      this._cartService
        .registerCartCache(data)
        .subscribe(
          this.handleCartResponse.bind(this),
          this.handleCartError.bind(this)
        );
    } else {
      this._cartService
        .registerCart(data)
        .subscribe(
          this.handleCartResponse.bind(this),
          this.handleCartError.bind(this)
        );
    }
  }

  private handleCartResponse(resp: any) {
    if (resp.message == 403) {
      this.errorResponse = true;
      this.errorMessage = resp.message_text;
    } else {
      this._cartService.changeCart(resp.cart);
      this.minicartService.openMinicart();
      this.closeModal();
    }
  }

  getPriceWithDiscount() {
    const discount = this.getDiscount();
    return this.priceCalculationService.getPriceWithDiscount(this.product_selected.price_usd, discount);
  }

  private handleCartError(error: any) {
    if (error.error.message === 'EL TOKEN NO ES VALIDO') {
      this._cartService._authService.logout();
    }
  }

  esProductoUnitario(variedades: any, valoresUnitarios: any) {
    for (const variedad of variedades) {
      if (valoresUnitarios.includes(variedad.valor)) {
        return false; // Si encuentra alguna de las variedades en valoresUnitarios, no es un producto unitario
      }
    }
    return true; // Si no encuentra ninguna de las variedades en valoresUnitarios, es un producto unitario
  }

  openModalToCart = (besProduct: any) => {
    this.product_selected = besProduct;
    this.filterUniqueGalerias(this.product_selected);
    this.setFirstImage();

    setTimeout(() => {
      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = this.product_selected.variedades
        .filter(
          (item: any, index: number, self: any[]) =>
            index ===
            self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)
        )
        .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1));

      this.variedad_selected = this.variedades[0] || null;
      this.activeIndex = 0;
      this.setColoresDisponibles();
      this.selectedColor = this.coloresDisponibles[0]?.color || '';
      this.filterUniqueGalerias(this.product_selected);
    }, 350);

    setTimeout(() => {
      // Usar querySelector para máxima compatibilidad
      const modalElement = document.querySelector('#addtocart_modal');

      // No inicializar sliders que no existen en este modal
      if (modalElement && (window as any).bootstrap) {
        const modalInstance = new (window as any).bootstrap.Modal(modalElement);
        modalElement.addEventListener(
          'shown.bs.modal',
          () => {
            // Solo inicializar plugins realmente presentes en el modal
            (window as any).productZoom && (window as any).productZoom($);
            (window as any).pswp && (window as any).pswp($);
          },
          { once: true }
        );
        modalInstance.show();
      }
      // Fallback jQuery (Bootstrap 4/5)
      if ((window as any).$) {
        (window as any).$('#addtocart_modal').on('shown.bs.modal', function () {
          (window as any).productZoom && (window as any).productZoom($);
          (window as any).pswp && (window as any).pswp($);
          (window as any).$('#addtocart_modal').off('shown.bs.modal');
        });
        (window as any).$('#addtocart_modal').modal('show');
      }
    }, 400);
  };

  openModal(besProduct: any, FlashSale: any = null) {
    this.product_selected = besProduct;
    setTimeout(() => {
      this.filterUniqueGalerias(this.product_selected);
      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = this.product_selected.variedades
        .filter(
          (item: any, index: number, self: any[]) =>
            index ===
            self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)
        )
        .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1));
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

  private closeModal(): void {
    // Usar Angular para manejar la visibilidad del modal o un servicio
    $('#quickview_modal').modal('hide');
  }

  getDiscount(FlashSale: any = null) {
    let discount = 0;
    if (FlashSale) {
      if (FlashSale.type_discount == 1) {
        return (
          FlashSale.discount *
          this.product_selected.price_usd *
          0.01
        ).toFixed(2);
      } else {
        return FlashSale.discount;
      }
    }
    return discount;
  }

  addWishlist = (product: any, FlashSale: any = null) => {
    // Leer usuario autenticado directamente desde this.currentUser o localStorage
    const user =
      this.currentUser ||
      (localStorage.getItem('user')
        ? JSON.parse(localStorage.getItem('user')!)
        : null);
    console.log('DEBUG addWishlist user:', user);
    // Requiere usuario autenticado con email
    if (!user || !user.email) {
      this.errorResponse = true;
      this.errorMessage =
        'Por favor, autentifíquese para poder añadir el producto a favoritos';
      alertSuccess('Autentifíquese para poder añadir el producto a favoritos');
      this._router.navigate(['/', this.locale, this.country, 'auth', 'login']);
      return;
    }

    let variedad_selected =
      product.variedades.find((v: any) => v.stock > 0) || null;

    let data = {
      user: user._id,
      product: product._id,
      type_discount: FlashSale ? FlashSale.type_discount : null,
      discount: FlashSale ? FlashSale.discount : 0,
      cantidad: 1,
      variedad: variedad_selected ? variedad_selected.id : null,
      code_cupon: null,
      code_discount: FlashSale ? FlashSale._id : null,
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscount(FlashSale),
      total: (product.price_usd - this.getDiscount(FlashSale)) * 1,
    };

    this.subscription = this._wishlistService.registerWishlist(data).subscribe(
      (resp: any) => {
        if (resp.message == 403) {
          this.errorResponse = true;
          alertDanger(resp.message_text);
          this.errorMessage = resp.message_text;
          return;
        } else {
          this._wishlistService.changeWishlist(resp.wishlist);
          alertSuccess(resp.message_text);
        }
      },
      (error) => {
        if (error.error.message == 'EL TOKEN NO ES VALIDO') {
          this._wishlistService._authService.logout();
        }
      }
    );
  };

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
        this.totalCarts = this.listCarts.reduce(
          (sum, item) => sum + parseFloat(item.total),
          0
        );
      })
    );
  }

  private subscribeToWishlistData(): void {
    this.subscriptions.add(
      this._wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
        this.listWishlists = resp;
        this.totalWishlist = this.listWishlists.reduce(
          (sum: any, item: any) => sum + parseFloat(item.total),
          0
        );
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

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Limpiar todos los timers de Flash Sales usando el servicio
    this.flashSaleTimerService.clearAllTimers();

    cleanupProductZoom($);
    this.cleanupPSWP();
    cleanupHOMEINITTEMPLATE($);
  }
}
