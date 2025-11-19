import {
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  Inject,
  Injectable,
  ElementRef,
  ViewChild,
} from '@angular/core';
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
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { SeoService } from 'src/app/services/seo.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';

// Importar los nuevos servicios especializados
import { 
  ProductDisplayService,
  CartManagerService,
  AddressManagerService,
  ShippingService,
  ImageManagerService
} from '../_service/service_landing_product';

declare var $: any;

declare function HOMEINITTEMPLATE($: any): any;
declare function sliderRefresh(): any;
declare function pswp($: any): any;
declare function productZoom([]): any;
declare function ModalProductDetail(): any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;

declare function productSlider5items($: any): any;

// ---- Destruir
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupProductZoom($: any): any;
declare function menuProductSlider($: any): any;

@Component({
  selector: 'app-landing-product',
  templateUrl: './landing-product.component.html',
  styleUrls: ['./landing-product.component.css'],
})
export class LandingProductComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUrl: string = '';
  euro = '€';
  listAddressClients: any = [];
  listAddressGuest: any = [];
  slug: any = null;
  product_selected: any = null;
  product_selected_modal: any = null;
  related_products: any = [];
  interest_products: any = [];
  variedad_selected: any = null;
  discount_id: any;
  order_selected: any = null;
  sale_orders: any = [];
  sale_details: any = [];
  cantidad: number = 1; // Cantidad del producto (siempre >= 1)
  title: any = null;
  description: any = null;
  sale_detail_selected: any = null;
  
  // Variable separada para calificación de reseñas (1-5 estrellas)
  calificacion: number = 0;
  REVIEWS: any = null;
  SALE_FLASH: any = null;
  AVG_REVIEW: any = null;
  COUNT_REVIEW: any = null;
  exist_review: any = null;
  activeIndex: number = 0;
  selectedColor: string = '';
  uniqueGalerias: any[] = [];
  firstImage: string = '';
  coloresDisponibles: { color: string; imagen: string }[] = [];
  variedades: any[] = [];
  availableSizesCamisetas = ['L', 'M', 'S', 'XL', '2XL', '3XL'];
  availableSizesHoodies = ['L', 'M', 'S', 'XL', '2XL', '3XL'];
  availableSizesPerfume = ['50ML', '100ML'];
  availableSizesMugs = ['11 oz', '15 oz'];
  availableSizesCaps = ['One size'];
  tallaError = false;
  cantidadError = false;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  isFallbackAddress: boolean = false;
  currentUser: any = null;
  errorResponse: boolean = false;
  errorMessage: any = '';
  locale: string = '';
  country: string = '';
  shippingRate: number = 0;
  fechaEntregaMin: string = '';
  fechaEntregaMax: string = '';
  shippingMethod: string = '';
  address: string = '';

 @ViewChild('carousel') carouselRef!: ElementRef<HTMLDivElement>;
  currentIndex = 0;

  fallbackAddress = {
    address: 'Gran Vía, 1',
    ciudad: 'Madrid',
    pais: 'España',
    zipcode: '28013',
  };

  usandoFallback: boolean = false;
  private subscriptions: Subscription = new Subscription();
  showOptions: boolean = false;
  showStickyCart = false;
  featuredImage: string = '';


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
    private seoService: SeoService,
    private ngZone: NgZone,
    private localizationService: LocalizationService,
    public loader: LoaderService,
    private priceCalculationService: PriceCalculationService,
    // Nuevos servicios especializados
    public productDisplayService: ProductDisplayService,
    public cartManagerService: CartManagerService,
    public addressManagerService: AddressManagerService,
    public shippingService: ShippingService,
    public imageManagerService: ImageManagerService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngAfterViewInit(): void {
    this.loader.loading$.subscribe(isLoading => {
      if (!isLoading) {
        // Espera a que Angular pinte el DOM
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            // Inicializa todos los sliders, incluido product-thumb
            (window as any).cleanupSliders($);
            (window as any).HOMEINITTEMPLATE($);
            (window as any).productZoom($);
            (window as any).pswp($);
            (window as any).productSlider5items($);
            (window as any).menuProductSlider($);
            (window as any).sliderRefresh($);

            // Detect changes por si necesitas que Angular actualice
            this.ngZone.run(() => {
              this.cdRef.detectChanges();
            });
          }, 300); // 300ms para asegurar que el DOM esté listo
        });
      }
    });
    
    this.scrollToCurrent();
  }

  // ngAfterViewInit(): void {
  //   this.ngZone.runOutsideAngular(() => {
  //     setTimeout(() => {
  //       (window as any).cleanupSliders($);
  //       (window as any).HOMEINITTEMPLATE($);
  //       (window as any).productZoom($);
  //       (window as any).pswp($);
  //       (window as any).productSlider5items($);
  //       (window as any).menuProductSlider($);
  //       (window as any).sliderRefresh($);

  //       // Si necesitas actualizar algo en Angular (por ejemplo, una bandera, vista, etc.)
  //       this.ngZone.run(() => {
  //         this.cdRef.detectChanges();
  //       });
  //     }, 150);
  //   });
  // }

  ngOnInit(): void {
    this.currentUrl = window.location.href; 
    this.showStickyCart = window.scrollY > 600;
    this.checkUserAuthenticationStatus();
    this.subscribeToRouteParams();
    this.subscribeToQueryParams();
    this.checkDeviceType();
    this.subscribeToServiceStates();
    this.inizialiteLoading();
  }

  nextSlide() {
    const track = this.carouselRef.nativeElement;
    if (this.currentIndex < track.children.length - 1) {
      this.currentIndex++;
      this.scrollToCurrent();
    }
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.scrollToCurrent();
    }
  }

  scrollToCurrent() {
    const track = this.carouselRef.nativeElement;
    const slide = track.children[this.currentIndex] as HTMLElement;
    track.style.transform = `translateX(-${slide.offsetLeft}px)`;
  }

  inizialiteLoading() {
    // Subscribe to loader to initialize and cleanup sliders when HTTP calls complete
    this.subscriptions.add(
      this.loader.loading$.subscribe((isLoading) => {
        if (!isLoading) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              // Initialize sliders and templates
              cleanupHOMEINITTEMPLATE($);
              cleanupProductZoom($);
              HOMEINITTEMPLATE($);
              productZoom($);
              pswp($);
              productSlider5items($);
              menuProductSlider($);
              sliderRefresh();
            }, 150);
          });
        } else {
          // Cleanup on loading start
          cleanupHOMEINITTEMPLATE($);
          cleanupProductZoom($);
        }
      })
    );
  }

  private subscribeToServiceStates(): void {
    // Suscribirse a cambios en los servicios especializados
    this.subscriptions.add(
      this.productDisplayService.product$.subscribe(product => {
        if (product && product !== this.product_selected) {
          this.product_selected = product;
        }
      })
    );

    this.subscriptions.add(
      this.imageManagerService.currentImage$.subscribe(image => {
        if (image && image !== this.firstImage) {
          this.firstImage = image;
        }
      })
    );

    this.subscriptions.add(
      this.shippingService.shippingCost$.subscribe(cost => {
        if (cost !== this.shippingRate) {
          this.shippingRate = cost;
        }
      })
    );

    this.subscriptions.add(
      this.addressManagerService.selectedAddress$.subscribe(address => {
        if (address && address.address !== this.address) {
          this.address = address.address;
        }
      })
    );

    // Suscribirse a los colores disponibles
    this.subscriptions.add(
      this.productDisplayService.coloresDisponibles$.subscribe(colors => {
        this.coloresDisponibles = colors.map(color => ({
          ...color,
          hex: this.getColorHex(color.color)
        }));
      })
    );
  }

  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest,
      ]).subscribe(([user, userGuest]) => {
        this.currentUser = user || userGuest;
      })
    );
  }

  storeIfAddressExists() {
    // Delegar al servicio de direcciones
    if (this.currentUser && !this.currentUser.email) {
      this.checkIfAddressGuestExists();
    } else {
      this.checkIfAddressClientExists();
    }
  }

  checkIfAddressClientExists() {
    // Usar el servicio de direcciones
    this.subscriptions.add(
      this.ecommerceAuthService.listAddressClient(this.currentUser._id).subscribe((resp: any) => {
      // --- DEBUG ---
        const addresses = resp.address_client || [];
        this.addressManagerService.updateClientAddresses(addresses);
        this.listAddressClients = addresses;
        
        if (this.addressManagerService.checkIfClientAddressExists(addresses)) {
          const defaultAddress = this.addressManagerService.getDefaultAddress(addresses);
          this.addressManagerService.selectAddress(defaultAddress);
          this.loadShippingRateWithAddress(defaultAddress);
        } else {
          console.warn('No hay direcciones disponibles para user auth.', this.fallbackAddress);
          this.loadShippingRateWithAddress(this.fallbackAddress, true);
          this.isFallbackAddress = true;
        }
      })
    );
  }

  checkIfAddressGuestExists() {
    // Usar el servicio de direcciones  
    this.subscriptions.add(
      this.ecommerceAuthService.listAddressGuest().subscribe((resp: any) => {
        const addresses = resp.addresses || [];
        this.addressManagerService.updateGuestAddresses(addresses);
        this.listAddressGuest = addresses;
        
        if (this.addressManagerService.checkIfGuestAddressExists(addresses)) {
          const defaultAddress = this.addressManagerService.getDefaultAddress(addresses);
          this.addressManagerService.selectAddress(defaultAddress);
          this.loadShippingRateWithAddress(defaultAddress);
        } else {
          console.warn('No hay direcciones disponibles para user guest.', this.fallbackAddress);
          this.loadShippingRateWithAddress(this.fallbackAddress, true);
          this.isFallbackAddress = true;
        }
      })
    );
  }

  loadShippingRateWithAddress(address: any, isFallback: boolean = false) {
    
    // Usar el servicio de envío
    this.subscriptions.add(
      this.shippingService.loadShippingRateWithAddress(address, isFallback).subscribe({
        next: (res: any) => {
          const rate = res.result?.[0];
          if (rate) {
            this.shippingService.updateShippingRate(rate);
            
            // Actualizar propiedades locales para el template
            this.shippingRate = parseFloat(rate.rate);
            this.fechaEntregaMin = this.formatearFechaEntrega(rate.minDeliveryDate);
            this.fechaEntregaMax = this.formatearFechaEntrega(rate.maxDeliveryDate);
            this.shippingMethod = rate.name;
            this.address = address.address;
            this.usandoFallback = isFallback;
          } else {
            console.log('❌ No se encontró tarifa en la respuesta');
            this.resetShippingData();
          }
        },
        error: (err) => {
          console.error('💥 Error al calcular tarifas de envío', err);
          this.resetShippingData();
        }
      })
    );
  }

  private resetShippingData() {
    this.shippingRate = 0;
    this.shippingMethod = '';
    this.fechaEntregaMin = '';
    this.fechaEntregaMax = '';
  }

  formatearFechaEntrega(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  private subscribeToRouteParams(): void {
    const routeParamsSubscription = this.routerActived.params.subscribe(
      (resp: any) => {
        this.slug = resp['slug'];
        this.initLandingProduct();
      }
    );
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(routeParamsSubscription);
  }

  private subscribeToQueryParams(): void {
    const queryParamsSubscription = this.routerActived.queryParams.subscribe(
      (resp: any) => {
        this.discount_id = resp['_id'];
      }
    );
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(queryParamsSubscription);
  }

  private initLandingProduct() {
    const productSubscription = this.ecommerceGuestService
      .showLandingProduct(this.slug, this.discount_id)
      .subscribe(
        (resp: any) => {
          this.handleProductResponse(resp);
        },
        (error) => {
          console.error('Error fetching product: ', error); // Captura errores
        }
      );

    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(productSubscription);
  }

  getPriceWithDiscount() {
    if (!this.product_selected) {
      return { integerPart: 0, decimalPart: '00', total: '0.00' };
    }

    // Si hay una variedad seleccionada con precio, usar ese precio
    let productForCalculation = this.product_selected;
    
    if (this.variedad_selected && this.variedad_selected.retail_price) {
      // Crear un objeto temporal con el precio de la variedad
      productForCalculation = {
        ...this.product_selected,
        price_usd: parseFloat(this.variedad_selected.retail_price)
      };
    }

    // Usar el servicio de cálculo de precios que ya aplica el redondeo a .95
    const finalPrice = this.priceCalculationService.calculateFinalPrice(
      productForCalculation, 
      this.SALE_FLASH ? [this.SALE_FLASH] : []
    );
    
    const priceParts = this.priceCalculationService.getPriceParts(finalPrice);
    
    return {
      integerPart: parseInt(priceParts.integer),
      decimalPart: priceParts.decimals,
      total: priceParts.total
    };
  }

  /**
   * Verifica si el producto tiene algún tipo de descuento aplicado
   */
  hasDiscount(): boolean {
    return this.getDiscount() > 0;
  }

  /**
   * Obtiene el precio final del producto (con descuento si aplica)
   */
  getFinalPrice(): number {
    if (!this.product_selected) {
      return 0;
    }

    // Si hay una variedad seleccionada con precio, usar ese precio
    let productForCalculation = this.product_selected;
    
    if (this.variedad_selected && this.variedad_selected.retail_price) {
      // Crear un objeto temporal con el precio de la variedad
      productForCalculation = {
        ...this.product_selected,
        price_usd: parseFloat(this.variedad_selected.retail_price)
      };
    }

    // Usar el servicio de cálculo de precios que ya aplica el redondeo a .95
    return this.priceCalculationService.calculateFinalPrice(
      productForCalculation, 
      this.SALE_FLASH ? [this.SALE_FLASH] : []
    );
  }

  /**
   * Obtiene el precio original (sin descuento) considerando la variedad seleccionada
   */
  getOriginalPrice(): number {
    if (!this.product_selected) {
      return 0;
    }

    // Si hay una variedad seleccionada con precio, usar ese precio
    if (this.variedad_selected && this.variedad_selected.retail_price) {
      return parseFloat(this.variedad_selected.retail_price);
    }

    // Si no, usar el precio base del producto
    return this.product_selected.price_usd;
  }

  /**
   * Obtiene las partes del precio (entero y decimal) para mostrar en el template
   */
  getPriceParts(price: number) {
    if (!this.priceCalculationService) {
      console.warn('PriceCalculationService not available');
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
  }

  private handleProductResponse(resp: any): void {
    console.log("🚀 handleProductResponse: resp:", resp);

    if (!resp || !resp.product) {
      console.error('No product data available');
      return; // Salir si no hay datos de producto
    }

    this.product_selected = resp.product;
    
    this.related_products = resp.related_products;
    this.interest_products = resp.interest_products
    //console.log("🚀 Padre: handleProductResponse() -> interest_products:", this.interest_products);
    
    this.SALE_FLASH = resp.SALE_FLASH;
    this.REVIEWS = resp.REVIEWS;
    this.AVG_REVIEW = resp.AVG_REVIEW;
    this.COUNT_REVIEW = resp.COUNT_REVIEW;

    if (this.product_selected) {
      // 🚀 Aquí llamamos a SEO
      this.setupSEO();
      this.storeIfAddressExists();

      let titleCategory = this.product_selected.categorie.title;
      this.product_selected.categorie.slug = this.generateSlug(titleCategory);

      // Si el usuario no es un invitado (Guest), entonces muestra el perfil
      if (this.currentUser && this.currentUser.email) {
        //if (this.currentUser && this.currentUser.user_guest !== "Guest") {
        this.showProfileClient(this.currentUser);
      }

      // Configurar servicios con el producto seleccionado
      this.initializeProductServices();
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

  generateSlug(title: string): string {
    return title
      .toLowerCase() // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '') // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-') // Reemplazar los espacios por guiones
      .replace(/-+/g, '-'); // Reemplazar múltiples guiones por uno solo
  }

  navigateToProduct(slug: string, discountId?: string) {
    // Guarda el estado para hacer scroll hacia arriba
    sessionStorage.setItem('scrollToTop', 'true');
    // Navega a la página del producto
    this._router
      .navigate(['/', this.locale, this.country, 'shop', 'product', slug])
      .then(() => {
        // Recarga la página
        window.location.reload();
      });
  }

  private sortVariedades() {
    this.selectedColor = this.product_selected.variedades[0]?.color || '';

    // Filtra las variedades por color y stock
    this.variedades = this.product_selected.variedades.filter(
      (variedad: any) => variedad.color === this.selectedColor
    );

    // Selecciona el array de tallas de acuerdo a la categoría del producto
    const categoryTitle = this.product_selected.categorie?.title?.toLowerCase() || '';
  
    let availableSizes: any = [];
    if (categoryTitle.toLowerCase().includes('t-shirts')) {
      availableSizes = this.availableSizesCamisetas;
    } else if (categoryTitle.toLowerCase().includes('mugs')) {
      availableSizes = this.availableSizesMugs;
    } else if (categoryTitle.toLowerCase().includes('dad hats / baseball caps')) {
      availableSizes = this.availableSizesCaps;
    } else if (categoryTitle.toLowerCase().includes('all shirts')) {
      availableSizes = this.availableSizesCamisetas;
    } else if (categoryTitle.toLowerCase().includes('hoodies')) {
      availableSizes = this.availableSizesHoodies;
    }

    // Mapea las tallas disponibles, mostrando stock positivo o tachado si no hay stock
    this.variedades = availableSizes
      .map((size: any) => {
        const foundVariedad = this.variedades.find(
          (variedad) => variedad.valor === size && variedad.stock > 0
        );
        return foundVariedad ? { ...foundVariedad } : { valor: size, stock: 0 };
      })
      .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1));

    // Selecciona la primera variedad con stock positivo
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
    if (sale_detail) {
      this.sale_detail_selected = sale_detail;
      if (this.sale_detail_selected.review) {
        this.title = this.sale_detail_selected.review.title;
        this.calificacion = this.sale_detail_selected.review.cantidad; // Esta es la calificación (estrellas)
        this.description = this.sale_detail_selected.review.description;
      } else {
        this.title = null;
        this.calificacion = 0; // Reset calificación, pero cantidad del producto mantiene su valor
        this.description = null;
      }
    }
  }

  private showProfileClient(currentUser: any) {
    let data = { user_id: currentUser._id };
    const saleSubscription = this.ecommerceAuthService
      .showProfileClient(data)
      .subscribe((resp: any) => {
        this.sale_orders = resp.sale_orders;
        this.sale_details = this.extractSaleDetails(resp.sale_orders);
        this.handleSaleDetailAndReview();
      });

    this.subscriptions.add(saleSubscription);
  }

  private handleSaleDetailAndReview() {
    const matchingSaleDetail = this.sale_details.find(
      (sale_detail: any) =>
        sale_detail.product._id === this.product_selected._id
    );
    const matchingReview = this.REVIEWS.find(
      (review: any) => review.productId === this.product_selected._id
    );
    this.configReview(matchingSaleDetail, matchingReview);
  }

  private configReview(matchingSaleDetail: any, matchingReview: any) {
    if (matchingSaleDetail && matchingReview) {
      this.viewReview(matchingSaleDetail);
    } else if (matchingSaleDetail && !matchingReview) {
      // Si existe sale_detail pero no hay review, mostrar form para agregar una nueva review
      this.viewReview(matchingSaleDetail);
      
    } else {
      // Ni no existe sale_detail y review, entonces no mostrar el form
      // Mostrar reseñas de otros usuarios para el producto seleccionado
      const otherReviews = this.REVIEWS.filter(
        (review: any) => review.productId === this.product_selected._id
      );

      if (otherReviews.length > 0) {
        // AQUI PODRÍAS MOSTRAR ESTAS RESEÑAS EN EL UI
        // POR EJEMPLO, PODRÍAS ASIGNAR A UNA VARIABLE EN EL COMPONENTE PARA RENDERIZAR EN EL TEMPLATE
        // this.displayOtherReviews(otherReviews);

      } else {
        this.viewReview(null); // O cualquier otro comportamiento que desees
      }
    }
  }

  filterUniqueGalerias() {
    // Delegar al servicio de imágenes
    const uniqueImages = this.imageManagerService.filterUniqueImagesFromVarieties(
      this.product_selected.galerias, 
      this.product_selected.imagen
    );
    this.uniqueGalerias = uniqueImages;
    this.imageManagerService.setGalleriaImages(uniqueImages);
  }

  setFirstImage() {
    // Delegar al servicio de imágenes
    this.imageManagerService.setFirstImage();
    
    // Suscribirse a cambios en la imagen actual
    this.subscriptions.add(
      this.imageManagerService.currentImage$.subscribe(image => {
        if (image) {
          this.firstImage = image;
        }
      })
    );
  }

  setColoresDisponibles() {
    // Delegar al servicio especializado
    this.productDisplayService.setColoresDisponibles(this.product_selected);
  }

  updateZoomImage(newImage: string) {
    // Delegar al servicio de imágenes
    this.imageManagerService.updateZoomImage(newImage);
    this.imageManagerService.setCurrentImage(newImage);
    this.firstImage = newImage;
  }

  getColorHex(color: string): string {
    const colorMap: { [key: string]: string } = {
      'Faded Black': '#424242',
      'Faded Khaki': '#dbc4a2',
      Black: '#080808',
      Navy: '#152438',
      Maroon: '#6c152b',
      Red: '#e41525',
      Royal: '#1652ac',
      'Sport Grey': '#9b969c',
      'Light blue': '#9dbfe2',
      'Faded Eucalyptus': '#d1cbad',
      'Faded Bone': '#f3ede4',
      White: '#ffffff',
      Leaf: '#5c9346',
      Autumn: '#c85313',
      // Nuevos colores encontrados en los logs
      'Carbon Grey': '#36454f',
      'Bone': '#e3dac3',
    };
    return colorMap[color] || '#cccccc';
  }

  getSwatchClass(imagen: string, color: string): any {
    return {
      active: this.selectedColor === color,
      [color.toLowerCase()]: true,
      'color-swatch': true,
    };
  }

  setActiveIndex(index: number) {
    // Delegar al servicio de imágenes
    this.imageManagerService.setActiveIndex(index);
    this.activeIndex = index;
  }

  openModal(besProduct: any, FlashSale: any = null) {
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
    if (!this.product_selected) {
      return 0;
    }

    let discount = 0;
    const basePrice = this.product_selected.price_usd || this.product_selected.price_soles || 0;

    // Prioridad 1: Flash Sale (si existe)
    if (this.SALE_FLASH) {
      if (this.SALE_FLASH.type_discount === 1) {
        // Descuento porcentual
        discount = (this.SALE_FLASH.discount * basePrice) / 100;
      } else if (this.SALE_FLASH.type_discount === 2) {
        // Descuento fijo
        discount = this.SALE_FLASH.discount;
      }
    }
    // Prioridad 2: Campaign Discount (si no hay Flash Sale)
    else if (this.product_selected.campaing_discount) {
      if (this.product_selected.campaing_discount.type_discount === 1) {
        // Descuento porcentual
        discount = (this.product_selected.campaing_discount.discount * basePrice) / 100;
      } else if (this.product_selected.campaing_discount.type_discount === 2) {
        // Descuento fijo
        discount = this.product_selected.campaing_discount.discount;
      }
    }

    return discount;
  }

  getCalNewPrice(product: any) {
    // if (this.FlashSale.type_discount == 1) {
    //   return product.price_soles - product.price_soles*this.FlashSale.discount*0.01;
    // } else {
    //   return product.price_soles - this.FlashSale.discount;
    // }
    return 0;
  }

  onColorSeleccionado(event: any) {
    const colorObj = event as { color: string; imagen: string };
    this.selectColor(colorObj);
  }

  selectColor(color: { color: string; imagen: string }) {
    console.log('🎨 Seleccionando color hijo mini color:', color.color);
    
    // Buscar imagen específica en las galerías para este color
    const galeriaConImagen = this.product_selected.galerias?.find(
      (g: any) => g.color === color.color && g.imagen
    );
    
    const imagenFinal = galeriaConImagen?.imagen || color.imagen;
    console.log('🎨 Imagen encontrada en galería:', galeriaConImagen?.imagen);
    console.log('🎨 Imagen final a mostrar:', imagenFinal);
    
    // Delegar al servicio especializado
    this.productDisplayService.selectColor({ ...color, imagen: imagenFinal });
    this.imageManagerService.setCurrentImage(imagenFinal);
    
    // Actualizar propiedades locales necesarias para el template
    this.selectedColor = color.color;
    this.firstImage = imagenFinal;
    
    // Actualizar variedades basadas en el color seleccionado
    this.updateVariedadesByColor(color.color);
  }

  private initializeProductServices() {
    // Configurar el producto en el servicio de display
    this.productDisplayService.setProduct(this.product_selected);
    
    // Configurar imágenes
    this.filterUniqueGalerias();
    this.setFirstImage();
    
    // Configurar colores disponibles
    this.setColoresDisponibles();
  }

  private updateVariedadesByColor(selectedColor: string) {
    // -- FILTRAR VARIEDADES PARA EL COLOR SELECCIONADO
    const filteredVariedades = this.product_selected.variedades
      .filter((variedad: any) => variedad.color === selectedColor)
      .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1)); // Ordenar las tallas de menor a mayor

    const categoryTitle =
      this.product_selected.categorie?.title?.toLowerCase() || '';
    const isCamisa = categoryTitle.toLowerCase().includes('t-shirts');
    const allShirts = categoryTitle.toLowerCase().includes('all shirts');
    const isGorra = categoryTitle.toLowerCase().includes('dad hats / baseball caps');
    const isHoodies = categoryTitle.toLowerCase().includes('hoodies');
    const isMugs = categoryTitle.toLowerCase().includes('mugs');

    // Determina las tallas disponibles según la categoría
    let filteredSizes: string[] = [];
    if (isHoodies) {
      filteredSizes = this.availableSizesHoodies;
    } else if (isMugs) {
      filteredSizes = this.availableSizesMugs;
    } else if (isCamisa) {
      filteredSizes = this.availableSizesCamisetas;
    } else if (isGorra) {
      filteredSizes = this.availableSizesCaps;
    } else if (allShirts) {
      filteredSizes = this.availableSizesCamisetas;
    }

    // Mapea las tallas de la categoría y marca las no disponibles
    this.variedades = filteredSizes.map((size) => {
      const foundVariedad = filteredVariedades.find(
        (variedad: any) => variedad.valor === size
      );
      return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
    });

    // Selecciona automáticamente la primera talla disponible
    this.variedad_selected = this.variedades.find((v) => v.stock > 0) || null;
    this.activeIndex = this.variedad_selected
      ? this.variedades.indexOf(this.variedad_selected)
      : 0;
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  selectedVariedad(variedad: any, index: number) {
    console.log('👕 Variedad seleccionada desde hijo:', variedad.valor);
    console.log('💰 Precio retail_price:', variedad.retail_price);
    
    this.variedad_selected = variedad;
    this.activeIndex = index;
    this.tallaError = false;
    this.showOptions = false;
  }

  incrementQty() {
    this.cantidad++;
    this.cantidadError = false;
  }

  decrementQty() {
    if (this.cantidad > 1) this.cantidad--;
    this.cantidadError = false;
  }

  addWishlist(product: any) {
    if (!this.currentUser) {
      this.errorResponse = true;
      this.errorMessage =
        'Por favor, autentifíquese para poder añadir el producto a favoritos';
      return;
    }

    let data = {
      user: this.currentUser._id,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $('#qty-cart').val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.cartManagerService.calculateUnitPrice(this.product_selected, this.SALE_FLASH),
      subtotal: this.cartManagerService.calculateSubtotal(this.product_selected, $('#qty-cart').val(), this.SALE_FLASH),
      total: this.cartManagerService.calculateTotal(this.product_selected, $('#qty-cart').val(), this.SALE_FLASH),
    };

    this.wishlistService.registerWishlist(data).subscribe(
      (resp: any) => {
        if (resp.message == 403) {
          this.errorResponse = true;
          this.errorMessage = resp.message_text;
          return;
        } else {
          this.wishlistService.changeWishlist(resp.wishlist);
          alertSuccess(resp.message_text);
        }
      },
      (error) => {
        if (error.error.message == 'EL TOKEN NO ES VALIDO') {
          this.wishlistService._authService.logout();
        }
      }
    );
  }

  increaseQuantity() {
    this.cantidad++;
    this.cantidadError = false; // resetea error si lo había
  }

  decreaseQuantity() {
    if (this.cantidad > 1) {
      this.cantidad--;
      this.cantidadError = false;
    }
  }

  onQuantityChange(event: any) {
    const value = Number(event.target.value);
    
    // Validar que sea un número válido y mayor que 0
    if (isNaN(value) || value < 1) {
      this.cantidad = 1;
    } else {
      this.cantidad = Math.floor(value); // Asegurar que sea entero
    }
    
    this.cantidadError = false;
  }

  onQuantityBlur(event: any) {
    // Asegurar que nunca esté vacío al perder foco
    const value = Number(event.target.value);
    
    if (isNaN(value) || value < 1 || event.target.value.trim() === '') {
      this.cantidad = 1;
      // Forzar actualización del input
      event.target.value = '1';
    }
    
    this.cantidadError = false;
  }

  storeCart() {
    this.saveCart();
  }

  private saveCart() {
    // Validaciones básicas
    if (this.cantidad <= 0) {
      this.showError('Debe seleccionar al menos 1 unidad');
      this.cantidadError = true;
      return;
    }

    if (this.product_selected.type_inventario == 2) {
      if (!this.variedad_selected) {
        this.tallaError = true;
        this.showError('Por favor seleccione una talla');
        return;
      }
      
      // Validar stock usando el servicio
      if (!this.cartManagerService.validateStockAvailability(
        this.product_selected, 
        this.variedad_selected, 
        this.cantidad
      )) {
        this.showError('La Cantidad excede el stock disponible. Elija menos unidades');
        this.cantidadError = true;
        return;
      }
    }

    // Preparar datos del producto para el carrito usando el servicio
    const productData = {
      product: this.product_selected,
      selectedColor: this.productDisplayService.getSelectedColor(),
      selectedSize: this.variedad_selected,
      quantity: this.cantidad,
      code_discount: this.getDiscount(),
      discount: this.getPriceWithDiscount(),
      user: this.currentUser,
      saleFlash: this.SALE_FLASH, // Flash Sale si existe
      campaignDiscount: this.product_selected.campaing_discount // Campaign Discount si existe
    };

    console.log('🛒 Añadiendo al carrito con datos:', productData);
    console.log('🔥 SALE_FLASH:', this.SALE_FLASH);
    console.log('📢 Campaign Discount:', this.product_selected.campaing_discount);
    

    // Añadir al carrito usando el servicio especializado
    this.subscriptions.add(
      this.cartManagerService.addToCart(productData).subscribe(
        (resp: any) => this.handleCartResponse(resp),
        (error: any) => this.handleCartError(error)
      )
    );
  }

  private showError(message: string) {
    this.errorResponse = true;
    this.errorMessage = message;
    alertDanger(message);
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
    if (error?.error?.message === 'EL TOKEN NO ES VALIDO') {
      this.cartService._authService.logout();
      return;
    }
    // Manejo de error: guest no existe
    if (
      error?.error?.message_text ===
      'El invitado (guest) no existe o la sesión ha expirado. Por favor, recarga la página o inicia una nueva sesión.'
    ) {
      this.errorResponse = true;
      this.errorMessage = error.error.message_text;
      alertDanger(error.error.message_text);
    }
    // Otros errores

    this.errorResponse = true;
    this.errorMessage =
      error?.error?.message_text ||
      'Ocurrió un error inesperado al añadir al carrito.';
    alertDanger(this.errorMessage);
  }

  addCalificacion(estrellas: number) {
    this.calificacion = estrellas; // Para reseñas (1-5 estrellas)
  }

  // Mantener método anterior por compatibilidad
  addCantidad(cantidad: number) {
    this.addCalificacion(cantidad);
  }

  storeReview() {
    this.sale_detail_selected.review ? this.updateReview() : this.saveReview();
  }

  saveReview() {
    if (!this.title || !this.cantidad || !this.description) {
      alertDanger('Todos los campos del formularios son importantes!');
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

    const reviewSubscription = this.ecommerceAuthService
      .registerProfileClientReview(data)
      .subscribe((resp: any) => {
        this.sale_detail_selected.review = resp.review;
        this.REVIEWS = [resp.review];
        alertSuccess(resp.message);
      });

    this.subscriptions.add(reviewSubscription);
  }

  updateReview() {
    if (!this.cantidad || !this.description) {
      alertDanger('Todos los campos del formularios son importantes!');
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

    const reviewUpdateSubscription = this.ecommerceAuthService
      .updateProfileClientReview(data)
      .subscribe((resp: any) => {
        this.sale_detail_selected.review = resp.review;
        this.REVIEWS = [resp.review];
        alertSuccess(resp.message);
      });

    this.subscriptions.add(reviewUpdateSubscription);
  }

  @HostListener('window:scroll', [])
  onScroll() {
    this.showStickyCart = window.scrollY > 600;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkDeviceType();
  }

  setupSEO() {
    const product = this.product_selected;

    // Title más descriptivo y con palabras clave
    const title = `Camiseta ${product.title} | Ropa para Programadores en LujanDev`;

    // Description más atractiva y útil para buscadores
    // Así usas la descripción real si está disponible, y el fallback solo si hace falta.
    const description =
      product.description_es &&
      product.description_es !== 'Descripción no disponible'
        ? product.description_es
        : `Compra la camiseta ${product.title} en LujanDev. Moda exclusiva para programadores, envío internacional rápido.`;

    // Imagen principal
    const image = product.imagen || '';

    // Llamada al servicio SEO
    this.seoService.updateSeo({
      title,
      description,
      image,
    });
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

  selectThumbnail(imagePath: string) {
    this.firstImage = imagePath;
  }

  openColorsModal() {
    if (this.coloresDisponibles.length > 0) {
      this.minicartService.openMiniSwatchesColor();
    }
  }

  openSizesModal() {
    if (this.variedades.length > 0) {
      this.minicartService.openMiniSwatchesSizes();
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    cleanupProductZoom($);
    this.cleanupPSWP();
    cleanupHOMEINITTEMPLATE($);
  }
}
