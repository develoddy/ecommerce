import { AfterViewInit, NgZone, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { Subscription, combineLatest } from 'rxjs';
import { MinicartService } from 'src/app/services/minicartService.service';
import { EcommerceAuthService } from '../../ecommerce-auth/_services/ecommerce-auth.service';
import { WishlistService } from '../_service/wishlist.service';

import { Title, Meta } from '@angular/platform-browser';
import { URL_FRONTEND } from 'src/app/config/config';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { LocalizationService } from 'src/app/services/localization.service';

declare var $:any;

declare function HOMEINITTEMPLATE($: any): any;
declare function sliderRefresh(): any;
declare function pswp($: any):any;
declare function productZoom([]):any;
declare function ModalProductDetail():any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

declare function productSlider5items($: any): any;

// ---- Destruir 
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupProductZoom($: any):any;
declare function menuProductSlider($: any):any;


@Component({
  selector: 'app-landing-product',
  templateUrl: './landing-product.component.html',
  styleUrls: ['./landing-product.component.css']
})
export class LandingProductComponent implements OnInit, AfterViewInit, OnDestroy {

  euro = "€";
  slug:any=null;
  product_selected:any = null;
  product_selected_modal:any=null;
  related_products:any = [];
  variedad_selected:any=null;
  discount_id:any;
  order_selected:any=null;
  sale_orders:any = [];
  sale_details:any = [];
  cantidad:any=0;
  title:any=null;
  description:any=null;
  sale_detail_selected:any=null;
  REVIEWS:any=null;
  SALE_FLASH:any = null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  exist_review:any=null;
  activeIndex: number = 0;
  selectedColor: string = '';
  uniqueGalerias: any[] = [];
  firstImage: string = '';
  coloresDisponibles: { color: string, imagen: string }[] = [];
  variedades: any[] = [];
  availableSizesCamisetas = ['S', 'M', 'L', 'XL', 'XXL'];  
  availableSizesZapatillas = ["37", "38", "39", "40", "41", "42"];
  availableSizesGorra = ["One size"];
  availableSizesPerfume = ["50ML", "100ML"];
  loading: boolean = false;
  tallaError = false; 
  cantidadError = false; 
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  currentUser: any = null;
  errorResponse:boolean=false;
  errorMessage:any="";
  locale: string = "";
  country: string = "";

  private subscriptions: Subscription = new Subscription();

  constructor(
    private cdRef: ChangeDetectorRef,
    public ecommerceGuestService: EcommerceGuestService,
    public ecommerceAuthService: EcommerceAuthService,
    public _router: Router,
    public routerActived: ActivatedRoute,
    public cartService: CartService,
    public authService: AuthService,
    public wishlistService: WishlistService,
    private minicartService: MinicartService,
    private titleService: Title, // seo
    private metaService: Meta,
    private ngZone: NgZone,
    private localizationService: LocalizationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngAfterViewInit(): void {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          (window as any).cleanupSliders($);
          (window as any).HOMEINITTEMPLATE($);
          (window as any).productZoom($);
          (window as any).pswp($);
          (window as any).productSlider5items($);
          (window as any).menuProductSlider($);
          (window as any).sliderRefresh($);
    
          // Si necesitas actualizar algo en Angular (por ejemplo, una bandera, vista, etc.)
          this.ngZone.run(() => {
            this.cdRef.detectChanges();
          });
    
        }, 150);
      });
  }

  ngOnInit(): void {
    this.subscriptions = this.ecommerceGuestService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
    
    this.checkUserAuthenticationStatus(); 
    this.subscribeToRouteParams();
    this.subscribeToQueryParams();
    this.checkDeviceType();

    // Verifica si se debe hacer scroll hacia arriba
    if (sessionStorage.getItem('scrollToTop') === 'true') {
      // Usar el evento load para asegurarse de que la página se haya cargado completamente
      window.addEventListener('load', () => {
          // Simula un clic en el botón de scroll hacia arriba
          $('#site-scroll').trigger('click');
          // Limpia la bandera
          sessionStorage.removeItem('scrollToTop');
      });
    }
  }

  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest
      ]).subscribe(([user, userGuest]) => {
        this.currentUser = user || userGuest;
      })
    );
  }

  private subscribeToRouteParams(): void {
    const routeParamsSubscription = this.routerActived.params.subscribe((resp: any) => {
      this.slug = resp["slug"];
      this.initLandingProduct();
    });
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(routeParamsSubscription);
  }
  
  private subscribeToQueryParams(): void {
    const queryParamsSubscription = this.routerActived.queryParams.subscribe((resp: any) => {
      this.discount_id = resp["_id"];
    });
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(queryParamsSubscription);
  }

  private initLandingProduct() {
    const productSubscription = this.ecommerceGuestService.showLandingProduct(this.slug, this.discount_id).subscribe(
      (resp:any) => {
        this.handleProductResponse(resp);
      },
      (error) => {
        console.error("Error fetching product: ", error); // Captura errores
      }); 

      // Añadir todas las suscripciones al objeto compuesto
      this.subscriptions.add(productSubscription);
  }

  getPriceWithDiscount() {
    const priceWithDiscount = this.product_selected.price_usd - this.getDiscount();
    const integerPart = Math.floor(priceWithDiscount); // Parte entera
    const decimalPart = ((priceWithDiscount - integerPart) * 100).toFixed(0); // Parte decimal
    return { integerPart, decimalPart };
  }
  

  private handleProductResponse(resp: any): void {
    if (!resp || !resp.product) {
      console.error("No product data available");
      return; // Salir si no hay datos de producto
    }
    this.product_selected = resp.product;

    this.related_products = resp.related_products;
    this.SALE_FLASH = resp.SALE_FLASH;
    this.REVIEWS = resp.REVIEWS;
    this.AVG_REVIEW = resp.AVG_REVIEW;
    this.COUNT_REVIEW = resp.COUNT_REVIEW;

    if (this.product_selected) {
      this.updateSeo();
      if (this.currentUser && this.currentUser.user_guest !== "Guest") {
        // Si el usuario no es un invitado (user_guest !== "Guest"), entonces muestra el perfil
        this.showProfileClient(this.currentUser);
      }
      
      this.filterUniqueGalerias();
      this.setFirstImage();
      this.setColoresDisponibles();
      this.sortVariedades();

      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          (window as any).cleanupSliders($);
          (window as any).HOMEINITTEMPLATE($);
          (window as any).productZoom($);
          (window as any).pswp($);
          (window as any).productSlider5items($);
          (window as any).menuProductSlider($);
          (window as any).sliderRefresh($);
        }, 150);
      });
    }
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
  
  private sortVariedades() {
    this.selectedColor = this.product_selected.variedades[0]?.color || '';

    // Filtra las variedades por color y stock
    this.variedades = this.product_selected.variedades.filter((variedad: any) => variedad.color === this.selectedColor);

    // Selecciona el array de tallas de acuerdo a la categoría del producto
    const categoryTitle = this.product_selected.categorie?.title?.toLowerCase() || '';

    console.log("SortVariedades: ", categoryTitle);
    
    
    let availableSizes:any = [];
    if (categoryTitle.toLowerCase().includes('t-shirts')) {
      availableSizes = this.availableSizesCamisetas;
    } else if (categoryTitle.toLowerCase().includes('snapbacks')) {
      availableSizes = this.availableSizesGorra;
    } else if (categoryTitle.toLowerCase().includes('all shirts')) {
      availableSizes = this.availableSizesCamisetas;
    } else if (categoryTitle.toLowerCase().includes('hoodies')) {
      availableSizes = this.availableSizesCamisetas;
    }
    
    //console.log("--- availableSizes: ", availableSizes);
    // Mapea las tallas disponibles, mostrando stock positivo o tachado si no hay stock
    this.variedades = availableSizes.map((size:any) => {
      const foundVariedad = this.variedades.find(variedad => variedad.valor === size && variedad.stock > 0);
      return foundVariedad ? { ...foundVariedad } : { valor: size, stock: 0 };
    }).sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1));

    // Selecciona la primera variedad con stock positivo
    //this.variedad_selected = this.variedades.find(v => v.stock > 0) || null;
    this.variedad_selected = null;
    this.activeIndex = 0;
  }

  private extractSaleDetails(orders: any[]): any[] {
    //return orders.flatMap(order => order.sale_details || []);
    let sale_details: any = [];
    orders.forEach((order: any) => {
      if (order && order.sale_details && Array.isArray(order.sale_details)) {
        order.sale_details.forEach((sale_detail: any) => {
           sale_details.push(sale_detail);
        });
      }
    });
    return sale_details;
  }

  private viewReview(sale_detail: any): void {
    if ( sale_detail ) {
      this.sale_detail_selected = sale_detail;
      if (this.sale_detail_selected.review) {
        this.title = this.sale_detail_selected.review.title;
        this.cantidad = this.sale_detail_selected.review.cantidad;
        this.description = this.sale_detail_selected.review.description;
      } else {
        this.title = null;
        this.cantidad = null;
        this.description = null;
      }
    }
  }

  private showProfileClient(currentUser:any) {
    let data = {user_id: currentUser._id};
    const saleSubscription =  this.ecommerceAuthService.showProfileClient(data).subscribe( ( resp: any ) => {
      console.log("310 ---> resp", resp);
      
      this.sale_orders = resp.sale_orders;
      this.sale_details = this.extractSaleDetails(resp.sale_orders); 
      this.handleSaleDetailAndReview();
    });

    this.subscriptions.add(saleSubscription);
  }

  private handleSaleDetailAndReview() {
    const matchingSaleDetail = this.sale_details.find((sale_detail:any) => sale_detail.product._id === this.product_selected._id);
    const matchingReview = this.REVIEWS.find((review:any) => review.productId === this.product_selected._id);
    this.configReview(matchingSaleDetail, matchingReview)
  }

  private configReview(matchingSaleDetail:any, matchingReview:any) {
    if ( matchingSaleDetail && matchingReview ) {
      this.viewReview(matchingSaleDetail);
    } else if ( matchingSaleDetail && !matchingReview ) { // Si existe sale_detail pero no hay review, mostrar form para agregar una nueva review
      this.viewReview(matchingSaleDetail); // Pasar un objeto vacio para iniciar un form en blanco
    } else {
      // Ni no existe sale_detail y review, entonces no mostrar el form
      // Mostrar reseñas de otros usuarios para el producto seleccionado
      const otherReviews = this.REVIEWS.filter(
        (review: any) => review.productId === this.product_selected._id
      );
      if (otherReviews.length > 0) {
        //console.log("Mostrando reseñas de otros usuarios:", otherReviews);
        // AQUI PODRÍAS MOSTRAR ESTAS RESEÑAS EN EL UI
        // POR EJEMPLO, PODRÍAS ASIGNAR A UNA VARIABLE EN EL COMPONENTE PARA RENDERIZAR EN EL TEMPLATE
        // this.displayOtherReviews(otherReviews);
      } else {
        //console.log("No hay reseñas disponibles para este producto.");
        this.viewReview(null); // O cualquier otro comportamiento que desees
      }
    }
  }

  filterUniqueGalerias() {
    const uniqueImages = new Set();
    this.uniqueGalerias = this.product_selected.galerias.filter( 
      ( galeria:any ) => {
        const isDuplicate = uniqueImages.has(galeria.imagen);
        uniqueImages.add(galeria.imagen);
        return !isDuplicate;
      });
  }

  setFirstImage() {
    if ( this.uniqueGalerias.length > 0 ) {
      this.firstImage = this.uniqueGalerias[ 0 ].imagen;
    }
  }

  setColoresDisponibles() {
    const uniqueColors = new Map();
    this.product_selected.galerias.forEach(
      ( galeria: any ) => {
        if ( !uniqueColors.has( galeria.color ) ) {
          uniqueColors.set(
            galeria.color, 
            { 
              imagen: galeria.imagen, 
              hex: this.getColorHex(galeria.color) 
            }
          );
        }
      });
    this.coloresDisponibles = Array.from(uniqueColors, ([color, { imagen, hex }]) => ({ color, imagen, hex }));
  }

  updateZoomImage(newImage: string) {
    this.firstImage = newImage;
  }

  getColorHex(color: string): string {
    const colorMap: { [ key: string ]: string } = {
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
    return colorMap[color] || ''; 
  }

  getSwatchClass(imagen: string, color: string): any {
    return { 'active': imagen === this.firstImage, [color.toLowerCase()]: true, 'color-swatch': true };
  }

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

  // getDiscount() {
  //   let discount = 0;
  //   if ( this.SALE_FLASH ) {
  //     if (this.SALE_FLASH.type_discount == 1) {
  //       return (this.SALE_FLASH.discount*this.product_selected.price_usd*0.01).toFixed(2);
  //     } else {
  //       return this.SALE_FLASH.discount;
  //     }
  //   }
  //   return discount;
  // }


  getDiscount() {
    let discount = 0;
    if (this.SALE_FLASH) {
      if (this.SALE_FLASH.type_discount == 1) {
        // Cálculo del descuento en porcentaje
        discount = this.SALE_FLASH.discount * this.product_selected.price_usd * 0.01;
      } else {
        // Descuento directo
        discount = this.SALE_FLASH.discount;
      }
    }
    return discount;
  }
  

  getCalNewPrice(product:any) {
    // if (this.FlashSale.type_discount == 1) {
    //   return product.price_soles - product.price_soles*this.FlashSale.discount*0.01;
    // } else {
    //   return product.price_soles - this.FlashSale.discount;
    // }
    return 0;
  }

  selectColor(color: { color: string, imagen: string }) {
    this.selectedColor = color.color;
    this.firstImage = color.imagen;

    // Filtrar variedades para el color seleccionado
    const filteredVariedades = this.product_selected.variedades
        .filter((variedad: any) => variedad.color === this.selectedColor)
        .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1)); // Ordenar las tallas de menor a mayor

    const categoryTitle = this.product_selected.categorie?.title?.toLowerCase() || '';

    // Detecta si el producto es de tipo zapatillas, camiseta, gorra o perfume
    const isZapatos = categoryTitle.toLowerCase().includes('zapatillas');
    const isCamisa = categoryTitle.toLowerCase().includes('t-shirts');
    const isGorra = categoryTitle.toLowerCase().includes('snapbacks');
    const isPerfume = categoryTitle.toLowerCase().includes('all shirts');

    // Determina las tallas disponibles según la categoría
    let filteredSizes: string[] = [];
    if (isZapatos) {
        filteredSizes = this.availableSizesZapatillas;
    } else if (isCamisa) {
        filteredSizes = this.availableSizesCamisetas;
    } else if (isGorra) {
        filteredSizes = this.availableSizesGorra;
    } else if (isPerfume) {
        filteredSizes = this.availableSizesPerfume;
    }

    // Mapea las tallas de la categoría y marca las no disponibles
    this.variedades = filteredSizes.map(size => {
        const foundVariedad = filteredVariedades.find((variedad: any) => variedad.valor === size);
        return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
    });

    // Selecciona automáticamente la primera talla disponible
    this.variedad_selected = this.variedades.find(v => v.stock > 0) || null;
    this.activeIndex = this.variedad_selected ? this.variedades.indexOf(this.variedad_selected) : 0;
  }
  
  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    this.activeIndex = index;
    this.tallaError = false;
  }

  addWishlist(product:any) {
    if(!this.currentUser) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, autentifíquese para poder añadir el producto a favoritos";
      return;
    }

    let data = {
      user          : this.currentUser._id,
      product       : this.product_selected._id,
      type_discount : this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount      : this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad      : $("#qty-cart").val(),
      variedad      : this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon    : null,
      code_discount : this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal      : this.product_selected.price_usd - this.getDiscount(),  
      total         : (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val()
    }

    this.wishlistService.registerWishlist( data ).subscribe((resp:any) => {
      if (resp.message == 403) {
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;
      } else {
        this.wishlistService.changeWishlist(resp.wishlist);
        alertSuccess( resp.message_text );
      }
    }, error => {
      console.log("__ Debbug > Error Register Wishlist 431: ", error.error.message);
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this.wishlistService._authService.logout();
      }
    });
  }

  storeCart(product: any) {
    const isGuest = this.currentUser.user_guest;
    this.saveCart(product, isGuest);
  }

  private saveCart(product: any, isGuest: String) {

    if ($("#qty-cart").val() == 0) {
      this.errorResponse = true;
      this.errorMessage = "Elija una cantidad válida para añadir al carrito";
      this.cantidadError = true;
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if (!this.variedad_selected) {
        this.tallaError = true; // Establecer el error de talla
        this.errorResponse = true;
        this.errorMessage = "Por favor seleccione una talla";
        return;
      }
      if (this.variedad_selected.stock < $("#qty-cart").val()) {
        this.errorResponse = true;
        this.errorMessage = "La Cantidad excede el stock disponible. Elija menos unidades";
        this.cantidadError = true;
        return;
      }
    }

    let data = {
      user: isGuest ? null : this.currentUser._id,
      user_status: isGuest,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: parseInt($("#qty-cart").val() as string, 10), //cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),
      total: (this.product_selected.price_usd - this.getDiscount()) * $("#qty-cart").val(),
    };

    if (isGuest) {
      this.cartService.registerCartCache(data).subscribe(this.handleCartResponse.bind(this), this.handleCartError.bind(this));
    } else {
      this.cartService.registerCart(data).subscribe(this.handleCartResponse.bind(this), this.handleCartError.bind(this));
    }
  }

  private handleCartResponse(resp: any) {
      if (resp.message == 403) {
          this.errorResponse = true;
          this.errorMessage = resp.message_text;
      } else {
          this.cartService.changeCart(resp.cart);
          this.minicartService.openMinicart();
      }
  }

  private handleCartError(error: any) {
      if (error.error.message === "EL TOKEN NO ES VALIDO") {
        this.cartService._authService.logout();
      }
  }

  addCantidad(cantidad:number) {
    this.cantidad = cantidad; 
  }

  storeReview() {
    this.sale_detail_selected.review ? this.updateReview() : this.saveReview();
  }

  saveReview() {
    if (!this.title || !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }
    
    let data = {
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.currentUser._id,
      cantidad: this.cantidad,
      title: this.title,
      description: this.description,
    };

    const reviewSubscription =  this.ecommerceAuthService.registerProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });

    this.subscriptions.add(reviewSubscription);
  }

  updateReview() {
    if (!this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }

    let data = {
      _id: this.sale_detail_selected.review.id,
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.currentUser._id,
      cantidad: this.cantidad,
      title: this.title,
      description: this.description,
    };

    const reviewUpdateSubscription = this.ecommerceAuthService.updateProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });

    this.subscriptions.add(reviewUpdateSubscription);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkDeviceType(); // Vuelve a verificar el tamaño en caso de cambio de tamaño de pantalla
  }
  
  private updateSeo(): void {
    const { title, resumen: description, imagen } = this.product_selected;
    const productUrl = `${URL_FRONTEND}product/${this.product_selected.slug}`;
    this.titleService.setTitle(`${title} | LujanDev Oficial`);
    this.metaService.updateTag({ name: 'description', content: description || 'Descripción del producto' });
    this.updateMetaTags(productUrl, title, description, imagen);
  }

  private updateMetaTags(url: string, title: string, description: string, imageUrl: string): void {
    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: imageUrl },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ];
    metaTags.forEach((tag:any) => this.metaService.updateTag(tag));
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

  ngOnDestroy(): void {
    // Desuscribir todas las suscripciones en el método OnDestroy
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
    // Limpiar los eventos y plugins que fueron inicializados
    cleanupProductZoom($);
    this.cleanupPSWP();
    cleanupHOMEINITTEMPLATE($);
  }
}
