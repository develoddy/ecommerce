import {
  Component,
  OnInit,
  HostListener,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ViewChild,
  ElementRef,
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
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { PriceCalculationService } from './_services/product/price-calculation.service';
import { FlashSaleTimerService, TimeLeft } from './_services/product/flash-sale-timer.service';
import { ProductUIService } from './_services/product/product-ui.service'; 
import { CartManagerService } from 'src/app/modules/home/_services/product/cart-manager.service';
import { ModalService } from 'src/app/modules/home/_services/product/modal.service';
import { ProductSelectionService } from 'src/app/modules/home/_services/product/product-selection.service';
import { SliderManagerService } from 'src/app/modules/home/_services/product/slider-manager.service';
import { WishlistManagerService } from 'src/app/modules/home/_services/product/wishlist-manager.service';
import { GridViewService, GridViewMode } from 'src/app/modules/home/_services/product/grid-view.service';
import { URL_FRONTEND } from 'src/app/config/config';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { EcommerceAuthService } from '../ecommerce-auth/_services/ecommerce-auth.service';

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
  besProducts: any = [];
  ourProducts: any = [];
  hoodiesProducts: any = [];
  mugsProducts: any = [];
  capsProducts: any = [];
  FlashSales: any = null;
  FlashProductList: any = [];
  currentUrl: string = window.location.href;
  sliders: any = [];
  categories: any = [];
  SALE_FLASH: any = null;
  product_selected: any = null;
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
  allTags: string[][] = [];
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
  timeLeft: { [flashId: string]: TimeLeft } = {};
  private timerInterval: any;
  public loading: boolean = false;
  
  // Grid view references
  @ViewChild('grid1') grid1!: ElementRef;
  @ViewChild('grid2') grid2!: ElementRef;
  @ViewChild('grid3') grid3!: ElementRef;
  @ViewChild('grid4') grid4!: ElementRef;
  @ViewChild('grid5') grid5!: ElementRef;
  
  currentGridView: GridViewMode;
  
  constructor(
    public _authEcommerce: EcommerceAuthService,
    public homeService: HomeService,
    public _cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    public _wishlistService: WishlistService,
    public _authService: AuthService,
    private localizationService: LocalizationService,
    private minicartService: MinicartService,
    private seoService: SeoService,
    //public loader: LoaderService,
    private subscriptionService: SubscriptionService,
    private priceCalculationService: PriceCalculationService,
    private flashSaleTimerService: FlashSaleTimerService,
    private productUIService: ProductUIService,
    private cartManagerService: CartManagerService,
    private modalService: ModalService,
    private productSelectionService: ProductSelectionService,
    private sliderManagerService: SliderManagerService,
    private wishlistManagerService: WishlistManagerService,
    private gridViewService: GridViewService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
    this.currentGridView = this.gridViewService.getCurrentView();
  }

  ngAfterViewInit(): void {
    this.sliderManagerService.initializeProductSliders();
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
    this.subscribeToGridViewChanges();
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
    this.hoodiesProducts = resp.hoodies_products;
    this.mugsProducts = resp.mugs_products;
    this.capsProducts = resp.caps_products;
    
    // Generar slug para cada categoría sin modificar el título original
    this.categories.forEach((category: any) => {
      category.slug = this.productUIService.generateSlug(category.title); 
    });

    // Generar slug para cada Hoodies sin modificar el título original
    this.hoodiesProducts.forEach((hoodie: any) => {
      hoodie.slug = this.productUIService.generateSlug(hoodie.title); 
    });

    // Generar slug para cada Mugs sin modificar el título original
    this.mugsProducts.forEach((mug: any) => {
      mug.slug = this.productUIService.generateSlug(mug.title); 
    });

    // Generar slug para cada Caps sin modificar el título original
    this.capsProducts.forEach((cap: any) => {
      cap.slug = this.productUIService.generateSlug(cap.title); 
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

    // Calcular precios finales para productos hodies usando el servicio
    this.hoodiesProducts = resp.hoodies_products.map((hodieProduct: any) => {
      hodieProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(hodieProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(hodieProduct.finalPrice);
      hodieProduct.priceInteger = priceParts.integer;
      hodieProduct.priceDecimals = priceParts.decimals;
      return hodieProduct;
    });

    // Calcular precios finales para productos mugs usando el servicio
    this.mugsProducts = resp.mugs_products.map((mugProduct: any) => {
      mugProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(mugProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(mugProduct.finalPrice);
      mugProduct.priceInteger = priceParts.integer;
      mugProduct.priceDecimals = priceParts.decimals;
      return mugProduct;
    });

    // Calcular precios finales para productos gorras usando el servicio
    this.capsProducts = resp.caps_products.map((capProduct: any) => {
      capProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(capProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(capProduct.finalPrice);
      capProduct.priceInteger = priceParts.integer;
      capProduct.priceDecimals = priceParts.decimals;
      return capProduct;
    });

    // Calcular precios finales para productos de Flash Sale usando el servicio
    this.FlashProductList = this.FlashProductList.map((flashProduct: any) => {
      flashProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(flashProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(flashProduct.finalPrice);
      flashProduct.priceInteger = priceParts.integer;
      flashProduct.priceDecimals = priceParts.decimals;
      return flashProduct;
    });

    // console.log("------> [DEBBUG] Our Products:", this.ourProducts);
    // console.log("------> [DEBBUG] Hoodies Products:", this.hoodiesProducts);
    // console.log("------> [DEBBUG] Mugs Products:", this.mugsProducts);
    //console.log("------> [DEBBUG] Caps Products:", this.capsProducts);
  }

  private finalizeDataProcessing(): void {
    if (this.ourProducts || this.besProducts || this.hoodiesProducts || this.mugsProducts || this.FlashProductList || this.capsProducts) {
      const processedProducts = this.productUIService.setColoresDisponibles(
        this.ourProducts, 
        this.besProducts,
        this.hoodiesProducts,
        this.mugsProducts,
        this.capsProducts,
        this.FlashProductList
      );
      
      this.ourProducts = processedProducts.ourProducts;
      this.besProducts = processedProducts.besProducts;
      this.hoodiesProducts = processedProducts.hoodiesProducts;
      this.mugsProducts = processedProducts.mugsProducts;
      this.capsProducts = processedProducts.capsProducts;
      this.FlashProductList = processedProducts.flashProductList;
    }

    this.setFirstImage();
  }

  initializePostLoadTasks() {
    this.subscriptionService.setShowSubscriptionSection(false);
    setTimeout(() => {
      this._authEcommerce.loading$.subscribe(isLoading => {
        if (!isLoading) {
          this.loading = !isLoading;
          this.setupFlashSaleTimers();
          this.initializeUIComponents();
        } else {
           this.cleanupUIComponents();
         }
      });
    }, 150);
  }

  // Subscribe to loader to initialize sliders after HTTP calls complete
  // private initializePostLoadTasks(): void {
  //   this.subscriptions.add(
  //     this.loader.loading$.subscribe((isLoading) => {
  //       if (!isLoading) {
  //         setTimeout(() => {
  //           this.setupFlashSaleTimers();
  //           this.initializeUIComponents();
  //         }, 150);
  //       } else {
  //         this.cleanupUIComponents();
  //       }
  //     })
  //   );
  // }

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
    this.sliderManagerService.initializeGlobalProductSliders();
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
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
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
    this.productSelectionService.filterUniqueVariedades(product_selected);
  }

  getSwatchClass(imagen: string, color: string): any {
    return this.productUIService.getSwatchClass(imagen, color, this.firstImage);
  }

  extractTags() {
    const result = this.productUIService.extractTags(this.besProducts);
    this.allTags = result.allTags;
    this.selectedColor = result.selectedColor;
  }

  reinitializeSliders(): void {
    this.sliderManagerService.reinitializeProductSliders();
  }

  filterUniqueGalerias(product_selected: any) {
    this.filteredGallery = this.productSelectionService.processGalleries(product_selected);
  }

  setFirstImage() {
    this.firstImage = this.productSelectionService.getFirstImage();
  }

  selectColor(color: { color: string; imagen: string }) {
    const selection = this.productSelectionService.selectColor(color.color, color.imagen);
    if (selection) {
      this.selectedColor = selection.selectedColor;
      this.firstImage = selection.firstImage;
    }
  }

  changeImage(imagen: string) {
    const selection = this.productSelectionService.changeImage(imagen);
    if (selection) {
      this.firstImage = selection.firstImage;
    }
  }

  initializeLargeSlider(): void {
    this.sliderManagerService.initializeLargeProductSlider();
  }

  destroyLargeSlider(): void {
    this.sliderManagerService.destroyLargeProductSlider();
  }

  initializeSmallSlider(): void {
    this.sliderManagerService.initializeSmallProductSlider();
  }

  destroySmallSlider(): void {
    this.sliderManagerService.destroySmallProductSlider();
  }

  changeProductImage = (product: any, imageUrl: string) => {
    this.productUIService.changeProductImage(product, imageUrl);
  }

  getColorHex(color: string): string {
    return this.productUIService.getColorHex(color);
  }

  getCalNewPrice(product: any): number {
    return this.priceCalculationService.calculateFinalPrice(product, this.FlashSales);
  }

  selectedVariedad(variedad: any, index: number) {
    const selection = this.productSelectionService.selectVariedad(variedad, index);
    if (selection) {
      this.variedad_selected = selection.selectedVariedad;
      this.activeIndex = selection.activeIndex;
    }
  }

  setActiveIndex(index: number) {
    const selection = this.productSelectionService.setActiveIndex(index);
    if (selection) {
      this.activeIndex = selection.activeIndex;
    }
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

  getRouterDiscount(besProduct: any) {
    if (besProduct.campaing_discount) {
      return { _id: besProduct.campaing_discount._id };
    }
    return {};
  }

  storeCart(product: any) {
    this.cartManagerService.storeCart(
      this.product_selected,
      this.variedad_selected,
      this.currentUser,
      this.SALE_FLASH,
      {
        onValidationError: (error) => {
          this.errorResponse = true;
          this.errorMessage = error.errorMessage || 'Error de validación';
          
          if (error.errorType === 'cantidad') {
            this.cantidadError = true;
          } else if (error.errorType === 'talla') {
            this.tallaError = true;
          } else if (error.errorType === 'stock') {
            this.cantidadError = true;
          }
        },
        onSuccess: (cart) => {
          // Éxito manejado por el servicio
        },
        onError: (message) => {
          this.errorResponse = true;
          this.errorMessage = message;
        },
        onTokenError: () => {
          // Token error manejado por el servicio
        }
      }
    );
  }

  getPriceWithDiscount() {
    return this.cartManagerService.getPriceWithDiscountParts(this.product_selected, this.SALE_FLASH);
  }

  esProductoUnitario(variedades: any, valoresUnitarios: any) {
    return this.cartManagerService.esProductoUnitario(variedades, valoresUnitarios);
  }

  openModalToCart = (besProduct: any) => {
    this.modalService.openModalToCart(
      besProduct,
      (product) => {
        // Cuando el producto está listo
        this.product_selected = product;
        // Inicializar selección del producto
        this.productSelectionService.initializeProductSelection(product, this.coloresDisponibles);
        this.setFirstImage();
      },
      (variedades, variedad_selected) => {
        // Cuando las variedades están listas
        this.variedades = variedades;
        const selection = this.productSelectionService.selectVariedad(variedad_selected, 0);
        if (selection) {
          this.variedad_selected = selection.selectedVariedad;
          this.activeIndex = selection.activeIndex;
          this.selectedColor = this.coloresDisponibles[0]?.color || '';
        }
      }
    ).then((result) => {
      // Resultado final con producto procesado
      this.product_selected = result.product;
      // Actualizar colores disponibles en el servicio
      this.productSelectionService.updateColoresDisponibles(this.coloresDisponibles);
    });
  };

  openModal(besProduct: any, FlashSale: any = null) {
    this.modalService.openProductDetailModal(
      besProduct,
      (product) => {
        // Cuando el producto está listo
        this.product_selected = product;
        // Inicializar selección del producto
        this.productSelectionService.initializeProductSelection(product, this.coloresDisponibles);
      }
    ).then((result) => {
      // Resultado final
      this.product_selected = result.product;
      this.variedades = result.variedades;
      
      // Usar el servicio para establecer la selección inicial
      const selection = this.productSelectionService.selectVariedad(result.variedad_selected, 0);
      if (selection) {
        this.variedad_selected = selection.selectedVariedad;
        this.activeIndex = selection.activeIndex;
        this.selectedColor = this.coloresDisponibles[0]?.color || '';
      }
    });
  }

  getDiscount(FlashSale: any = null) {
    return this.cartManagerService.calculateDiscount(this.product_selected, FlashSale);
  }

  addWishlist = (product: any, FlashSale: any = null) => {
    this.subscription = this.wishlistManagerService.addToWishlist(
      product,
      FlashSale,
      this.locale,
      this.country
    ).subscribe((result) => {
      if (!result.success) {
        this.errorResponse = true;
        this.errorMessage = result.message;
      }
      // En caso de éxito, el servicio ya maneja la actualización y las alertas
    });
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
      this.wishlistManagerService.wishlistData$.subscribe((wishlistData) => {
        this.listWishlists = wishlistData.items;
        this.totalWishlist = wishlistData.totalAmount;
      })
    );
  }

  private subscribeToGridViewChanges(): void {
    this.subscriptions.add(
      this.gridViewService.currentView$.subscribe((view) => {
        console.log('🔄 Home - Grid view changed:', view);
        this.currentGridView = view;
        console.log('📊 Home - Updated currentGridView:', this.currentGridView);
        this.updateGridViewUI();
      })
    );
  }

  // Grid View Methods
  setGridView(columns: number): void {
    console.log('🎯 Home - setGridView called with columns:', columns);
    this.gridViewService.setGridView(columns);
    console.log('📊 Home - Current grid view after set:', this.currentGridView);
  }

  private updateGridViewUI(): void {
    // Remove active class from all grid buttons
    [this.grid1, this.grid2, this.grid3, this.grid4, this.grid5].forEach((grid, index) => {
      if (grid?.nativeElement) {
        grid.nativeElement.classList.remove('active');
        if (index + 1 === this.currentGridView.columns) {
          grid.nativeElement.classList.add('active');
        }
      }
    });
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

    // Limpiar todos los sliders
    this.sliderManagerService.cleanup();

    cleanupProductZoom($);
    this.cleanupPSWP();
    cleanupHOMEINITTEMPLATE($);
  }
}
