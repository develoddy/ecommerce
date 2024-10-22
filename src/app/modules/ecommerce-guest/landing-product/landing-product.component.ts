import { AfterViewInit, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
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
export class LandingProductComponent implements OnInit, OnDestroy {

  euro = "€";
  slug:any=null;
  product_selected:any = null;
  product_selected_modal:any=null;
  related_products:any = [];
  variedad_selected:any=null;
  discount_id:any;
  SALE_FLASH:any = null;
  order_selected:any=null;
  sale_orders:any = [];
  sale_details:any = [];
  cantidad:any=0;
  title:any=null;
  description:any=null;
  sale_detail_selected:any=null;

  REVIEWS:any=null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  exist_review:any=null;

  activeIndex: number = 0;
  selectedColor: string = '';
  uniqueGalerias: any[] = [];
  firstImage: string = '';
  coloresDisponibles: { color: string, imagen: string }[] = [];
  variedades: any[] = [];
  availableSizes = ['S', 'M', 'L', 'XL']; 
  loading: boolean = false;

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  currentUser: any = null;

  errorResponse:boolean=false;
  errorMessage:any="";

  private subscriptions: Subscription = new Subscription(); 

  private routeParamsSubscription: Subscription | undefined;
  private queryParamsSubscription: Subscription | undefined;
  private productSubscription: Subscription | undefined;

  constructor(
    public ecommerceGuestService: EcommerceGuestService,
    public ecommerceAuthService: EcommerceAuthService,
    public _router: Router,
    public routerActived: ActivatedRoute,
    public cartService: CartService,
    public authService: AuthService,
    public wishlistService: WishlistService,
    private minicartService: MinicartService,
    private titleService: Title, // seo
    private metaService: Meta
  ) {
    this.ecommerceGuestService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  ngOnInit(): void {
    this.checkUserAuthenticationStatus(); 
    this.subscribeToRouteParams();
    this.subscribeToQueryParams();
    this.initLandingProduct();
    this.checkDeviceType();
  }


  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest
      ]).subscribe(([user, userGuest]) => {
        this.currentUser = user || userGuest; // Usa el usuario autenticado o invitado
        // if (this.currentUser) {
        //   this.processUserStatus();  // Procesar el usuario
        // } else {
        //   console.log("Error: No hay usuario autenticado o invitado.");
        // }
      })
    );
  }


  // private checkUserAuthenticationStatus(): void {
  //   this.ecommerceAuthService._authService.user.subscribe(user => {
  //     console.log("Debbug checkUserAuthenticationStatus - User: ", user);
  //     this.currentUser = user || null;
  //   });

  //   this.ecommerceAuthService._authService.userGuest.subscribe(userGuest => {
  //     console.log("Debbug checkUserAuthenticationStatus - UserGuest ", userGuest);
  //     this.currentUser = userGuest || null;
  //   });
  // }

  private subscribeToRouteParams(): void {
    this.routeParamsSubscription = this.routerActived.params.subscribe((resp: any) => {
      this.slug = resp["slug"];
    });
  }
  
  private subscribeToQueryParams(): void {
    this.queryParamsSubscription = this.routerActived.queryParams.subscribe((resp: any) => {
      this.discount_id = resp["_id"];
    });
  }

  private initLandingProduct() {
    this.productSubscription = this.ecommerceGuestService.showLandingProduct(this.slug, this.discount_id).subscribe(
      (resp:any) => {
        this.handleProductResponse(resp);
        setTimeout(() => {
          HOMEINITTEMPLATE($);
          pswp($);
          productZoom($);
        }, 50);
      }); 
  }

  private handleProductResponse(resp: any): void {
    this.product_selected = resp.product;
    this.related_products = resp.related_products;
    this.SALE_FLASH = resp.SALE_FLASH;
    this.REVIEWS = resp.REVIEWS;
    this.AVG_REVIEW = resp.AVG_REVIEW;
    this.COUNT_REVIEW = resp.COUNT_REVIEW;

    if (this.product_selected) {
      this.updateSeo();
      if (this.currentUser) {
        console.log("Hanlde product response: ", this.currentUser);
        this.showProfileClient(this.currentUser);
      }

      this.filterUniqueGalerias();
      this.setFirstImage();
      this.setColoresDisponibles();
      this.sortVariedades();
    }
  }

  private sortVariedades() {
    this.selectedColor = this.coloresDisponibles[ 0 ]?.color || '';
    this.variedades = this.product_selected.variedades
        .filter((variedad: any) => variedad.color === this.selectedColor)
        .sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);
    this.variedades = this.availableSizes.map(size => {
        const foundVariedad = this.variedades.find( variedad => variedad.valor === size );
        return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
    });
    this.variedad_selected = this.variedades.find( v => v.stock > 0 ) || null;
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

    console.log("ShowProfile: ", currentUser);
    
    let data = {user_id: currentUser._id};
    this.ecommerceAuthService.showProfileClient(data).subscribe( ( resp: any ) => {
      this.sale_orders = resp.sale_orders;
      this.sale_details = this.extractSaleDetails(resp.sale_orders); 
      this.handleSaleDetailAndReview();
    });
  }

  private handleSaleDetailAndReview() {
    const matchingSaleDetail = this.sale_details.find((sale_detail:any) => sale_detail.product._id === this.product_selected._id);
    const matchingReview = this.REVIEWS.find((review:any) => review.productId === this.product_selected._id);
    this.configReview(matchingSaleDetail, matchingReview)
  }

  private configReview(matchingSaleDetail:any, matchingReview:any) {
    if ( matchingSaleDetail && matchingReview ) {
      console.log("Se encontró un sale_detail y una review coincidentes:", matchingSaleDetail, matchingReview); // si existe sale_detail & review, entonces mistrar form
      this.viewReview(matchingSaleDetail);
    } else if ( matchingSaleDetail && !matchingReview ) { // Si existe sale_detail pero no hay review, mostrar form para agregar una nueva review
      console.log("Se encontró un sale_detail pero no hay review. Mostrar formulario para agregar review.", matchingSaleDetail);
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

  getDiscount() {
    let discount = 0;
    if ( this.SALE_FLASH ) {
      if (this.SALE_FLASH.type_discount == 1) {
        return (this.SALE_FLASH.discount*this.product_selected.price_usd*0.01).toFixed(2);
      } else {
        return this.SALE_FLASH.discount;
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

    // Filtrar las tallas disponibles para el color seleccionado
    const filteredVariedades = this.product_selected.variedades
        .filter((variedad: any) => variedad.color === this.selectedColor)
        .sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1); // Ordenar las tallas de menor a mayor

    // Mapear las tallas generales y marcar las no disponibles
    this.variedades = this.availableSizes.map(size => {
        const foundVariedad = filteredVariedades.find( (variedad:any) => variedad.valor === size);
        return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
    });

    // Seleccionar automáticamente la primera talla disponible
    this.variedad_selected = this.variedades.find(v => v.stock > 0) || null;
    this.activeIndex = this.variedad_selected ? this.variedades.indexOf(this.variedad_selected) : 0;

    //console.log(`Talla seleccionada: ${this.variedad_selected?.valor || 'Ninguna disponible'}`);
  }

  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    this.activeIndex = index;
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
    console.log(`Debug: El usuario ${isGuest ? 'no está logueado' : 'está logueado'}, guardando el artículo en ${isGuest ? 'LocalStorage' : 'la base de datos'}`);

    if ($("#qty-cart").val() == 0) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta";
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if (!this.variedad_selected) {
        this.errorResponse = true;
        this.errorMessage = "No hay stock disponible para este color";
        return;
      }
      if (this.variedad_selected.stock < $("#qty-cart").val()) {
        this.errorResponse = true;
        this.errorMessage = "Por favor, reduzca la cantidad. Stock insuficiente";
        return;
      }
    }

    let data = {
      user: isGuest ? null : this.currentUser._id,
      user_status: isGuest,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $("#qty-cart").val(),
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

  /*
  storeCart(product:any) {
    this.currentUser.user_guest ? this.saveCartToLocalStorage(product) : this.saveCartToDatabase(product);
  }

  private saveCartToLocalStorage(product: any) {
    console.log("Debbug: El usuario no está Logeado y estas guardando el articulo en la tabla CartCache");
    if ( $("#qty-cart").val() == 0 ) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta";
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if ( !this.variedad_selected ) {
        this.errorResponse = true;
        this.errorMessage = "No hay stock disponible para este color";
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          this.errorResponse = true;
          this.errorMessage = "Por favor, reduzca la cantidad. Stock insuficiente";
          return;
        }
      }
    }

    let data = {
      user: null,
      user_status: this.currentUser.user_guest,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),
      total: (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val(),
    }

    this.cartService.registerCartCache(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;
      } else {
        this.cartService.changeCart(resp.cart);
        this.minicartService.openMinicart();
      }
    }, error => {
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this.cartService._authService.logout();
      }
    });
  }
    
  private saveCartToDatabase(product:any) {
    if ( $("#qty-cart").val() == 0 ) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta";
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if ( !this.variedad_selected ) {
        this.errorResponse = true;
        this.errorMessage = "No hay stock disponible para este color";
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          this.errorResponse = true;
          this.errorMessage = "Por favor, reduzca la cantidad. Stock insuficiente";
          return;
        }
      }
    }

    let data = {
      user: this.currentUser._id,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),
      total: (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val(),
    }

    this.cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;
      } else {
        this.cartService.changeCart(resp.cart);
        this.minicartService.openMinicart();
      }
    }, error => {
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this.cartService._authService.logout();
      }
    });
  }*/

  ngOnDestroy(): void {
    if (this.routeParamsSubscription) {
      this.routeParamsSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
    if (this.productSubscription) {
      this.productSubscription.unsubscribe();
    }

    const elevateZoomInstance = $('.zoompro').data('elevateZoom');
    if (elevateZoomInstance) {
      $('.zoomContainer').remove(); 
      $('.zoompro').off('.elevateZoom');
      $('.zoompro').removeData('elevateZoom');
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

    this.ecommerceAuthService.registerProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });
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

    this.ecommerceAuthService.updateProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });
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

  checkDeviceType() {
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
}
