import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy, EventEmitter, Output, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, forkJoin, fromEvent, Observable, of, Subscription, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { EcommerceGuestService } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
import { WishlistService } from 'src/app/modules/ecommerce-guest/_service/wishlist.service';
import { LanguageService } from 'src/app/services/language.service';
import { MinicartService } from 'src/app/services/minicartService.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { combineLatest } from 'rxjs';
import { LocalizationService } from 'src/app/services/localization.service';
import { HeaderEventsService } from 'src/app/services/headerEvents.service';
import { HomeService } from 'src/app/modules/home/_services/home.service';
import { ProductUIService } from 'src/app/modules/home/_services/product/product-ui.service';
import { PriceCalculationService } from 'src/app/modules/home/_services/product/price-calculation.service';
import { SafeUrl } from '@angular/platform-browser';
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
declare var $: any;
declare var $:any;
declare function HOMEINITTEMPLATE([]): any;
declare function productSlider5items($: any): any;

declare function pswp([]):any;
declare function productZoom([]):any;
declare function alertDanger([]): any;
declare function alertSuccess([]): any;

declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function sliderRefresh($$: any): any;
declare function menuProductSlider($: any): any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

  @Output() forceLogin = new EventEmitter<void>();

  euro = "€";
  selectedLanguage: string = 'ES';
  listCarts: any[] = [];
  listWishlists: any = [];
  totalCarts: number = 0;
  totalWishlist: number = 0;
  search_product: string = "";
  selected_category: string = "0";
  products_search: any[] = [];
  categories: any[] = [];
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  source: any;
  locale: string = "";
  country: string = "";
  currentUser: any = null;
  width: number = 100; // valor por defecto
  height: number = 100; // valor por defecto
  ourProducts: any = [];
  hoodiesProducts: any = [];
  mugsProducts: any = [];
  capsProducts: any = [];
  FlashProductList: any = [];
  FlashSales: any = null;
  @ViewChild("filter") filter?: ElementRef;
  private subscriptions: Subscription = new Subscription();
  showSubscriptionSection: boolean = true;
  sanitizedUrl: SafeUrl = '';
  selectedColors: { [productId: string]: number } = {}; // Track selected color index for each product
  productImages: { [productId: string]: string } = {}; // Track current image for each product
  selectedSizes: { [productId: string]: string } = {}; // Track selected size for each product
  hoveredProduct: string | null = null; // Track which product is being hovered
  

  categorieOurProducts: any;
  categorieHoodies: any;
  categorieMugs: any;
  categorieCaps: any;

  //isFixed: boolean = true; // por defecto fixed

  constructor(
    private router: Router,
    private cartService: CartService,
    public authService: AuthService,
    private activatedRoute: ActivatedRoute,
    private wishlistService: WishlistService,
    private ecommerceGuestService: EcommerceGuestService,
    private minicartService: MinicartService,
    private subscriptionService: SubscriptionService,
    private localizationService: LocalizationService,
    private headerEventsService: HeaderEventsService,
    private cd: ChangeDetectorRef,
    public homeService: HomeService,
    private productUIService: ProductUIService,
    private priceCalculationService: PriceCalculationService,
    private renderer: Renderer2,
    private el: ElementRef
    // public loader: LoaderService,
  ) {
    this.subscriptions.add(
      this.subscriptionService.showSubscriptionSection$.subscribe(value => {
        this.showSubscriptionSection = value;
      })
    );
  }

  ngOnInit() {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;

    // ✅ Evaluar inmediatamente según la ruta actual
    // this.isFixed = this.router.url.includes('/home');
    // console.log('🔹 Ruta actual:', this.router.url, '| isFixed:', this.isFixed);

    // // ✅ Actualizar cuando cambie la ruta
    // this.subscriptions.add(
    //   this.router.events
    //     .pipe(filter(event => event instanceof NavigationEnd))
    //     .subscribe((event: any) => {
    //       this.isFixed = event.urlAfterRedirects.includes('/home');
    //       console.log('➡️ Navegaste a:', event.urlAfterRedirects, '| isFixed:', this.isFixed);
    //     })
    // );
     

    // this.router.events
    //   .pipe(filter(event => event instanceof NavigationEnd))
    //   .subscribe((event: any) => {
    //     const header = this.el.nativeElement.querySelector('.header');

    //     // ✅ Rutas donde SÍ quieres el header fijo
    //     const fixedRoutes = ['/home'];

    //     if (fixedRoutes.some(route => event.urlAfterRedirects.includes(route))) {
    //       // Quita el modo fijo
    //       this.renderer.removeClass(header, 'header.no-fixed-header');
          
    //     } else {
    //       // Activa modo fijo
    //       this.renderer.addClass(header, 'header.no-fixed-header');
    //     }
    //   });

    
    this.initializeHomeData();

    this.checkUserAuthenticationStatus();
      // Initial header visibility based on current route
      this.showSubscriptionSection = !this.router.url.includes('/checkout');
      // Update header visibility on route changes
      this.subscriptions.add(
        this.router.events.pipe(
          filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
          this.showSubscriptionSection = !event.urlAfterRedirects.includes('/checkout');
        })
      );

    this.subscribeToCartData(); 
    this.subscribeToWishlistData();
    this.subscribeToEcommerceConfig();
    this.checkDeviceType();

    // Escuchar el evento forceLogin para abrir el menú de cuenta automáticamente
    this.subscriptions.add(
      this.headerEventsService.forceLogin$.subscribe(() => {
        // No hace nada, jQuery controla el menú de cuenta
      })
    );
  }

  private initializeHomeData(): void {
    const TIME_NOW = new Date().getTime();

    const listHomeSubscription = this.homeService.listHome(TIME_NOW).subscribe((resp: any) => {
      this.processBasicData(resp);
      this.processProductPrices(resp);
      this.finalizeDataProcessing();


       // Espera a que Angular renderice el DOM
      setTimeout(() => {
        cleanupHOMEINITTEMPLATE($);
        menuProductSlider($);
        sliderRefresh($); // inicializa tu carrusel
      }, 100);
    });

    this.subscriptions.add(listHomeSubscription);
  }

  private processBasicData(resp: any): void {
    //console.log("----> [Components Header] Home data received:", resp);
    
    // Asignar datos básicos primero
    this.ourProducts = resp.our_products
    this.hoodiesProducts = resp.hoodies_products;
    this.mugsProducts = resp.mugs_products;
    this.capsProducts = resp.caps_products;
    this.FlashProductList = resp.campaign_products;
    this.FlashSales = resp.FlashSales;
    
    // Generar slug para cada categoría sin modificar el título original
    this.categories.forEach((category: any) => {
      category.slug = this.productUIService.generateSlug(category.title); 
    });

    // Generar slug para cada Camisetas sin modificar el título original
    this.ourProducts.forEach((product: any) => {
      product.slug = this.productUIService.generateSlug(product.title); 
    });
    this.categorieOurProducts = this.categories.find(cat => cat.slug.toLowerCase() === "all-shirts");

    // Generar slug para cada Hoodies sin modificar el título original
    this.hoodiesProducts.forEach((hoodie: any) => {
      hoodie.slug = this.productUIService.generateSlug(hoodie.title); 
    });
    this.categorieHoodies = this.categories.find(cat => cat.slug.toLowerCase() === "hoodies");

    // Generar slug para cada Mugs sin modificar el título original
    this.mugsProducts.forEach((mug: any) => {
      mug.slug = this.productUIService.generateSlug(mug.title);
      mug.categorie.slug = this.productUIService.generateSlug(mug.categorie?.title || ''); 
    });
    this.categorieMugs = this.categories.find(cat => cat.slug.toLowerCase() === "mugs");

    // Generar slug para cada Caps sin modificar el título original
    this.capsProducts.forEach((cap: any) => {
      cap.slug = this.productUIService.generateSlug(cap.title);
      cap.categorie.slug = this.productUIService.generateSlug(cap.categorie?.title || '');
    });
    this.categorieCaps = this.categories.find(cat => cat.slug.toLowerCase() === "dad-hats-baseball-caps");
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


    // Calcular precios finales para productos de Flash Sale usando el servicio
    this.FlashProductList = this.FlashProductList.map((flashProduct: any) => {
      flashProduct.finalPrice = this.priceCalculationService.calculateFinalPrice(flashProduct, this.FlashSales);
      const priceParts = this.priceCalculationService.getPriceParts(flashProduct.finalPrice);
      flashProduct.priceInteger = priceParts.integer;
      flashProduct.priceDecimals = priceParts.decimals;
      
      return flashProduct;
    });
  }

  getPriceParts = (price: number) => {
    if (!this.priceCalculationService) {
      return { integer: '0', decimals: '00', total: '0.00' };
    }
    return this.priceCalculationService.getPriceParts(price);
  }

  private finalizeDataProcessing(): void {
    if (this.ourProducts || this.hoodiesProducts || this.mugsProducts || this.FlashProductList) {
      const processedProducts = this.productUIService.setColoresDisponibles(
        this.ourProducts, 
        [],
        this.hoodiesProducts,
        this.mugsProducts,
        this.capsProducts,
        this.FlashProductList
      );
      
      this.ourProducts = processedProducts.ourProducts;
      this.hoodiesProducts = processedProducts.hoodiesProducts;
      this.mugsProducts = processedProducts.mugsProducts;
      this.FlashProductList = processedProducts.flashProductList;
      this.capsProducts = processedProducts.capsProducts;
    }
  }

  getDiscountLabel(product: any): string | null {
    // Solo manejar campaing_discount, NO Flash Sales
    // Los Flash Sales tienen su propio componente separado
    if (product.campaing_discount && product.campaing_discount.type_discount === 1) {
      const discountPercent = product.campaing_discount.discount;
      if (discountPercent && discountPercent > 0) {
        return `¡Oferta –${discountPercent}%!`;
      }
    }
    return null;
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase() // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '') // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-') // Reemplazar los espacios por guiones
      .replace(/-+/g, '-'); // Reemplazar múltiples guiones por uno solo
  }

  isColorSelected(product: any, colorIndex: number): boolean {
    const productId = typeof product === 'string' ? product : (product.uniqueId || product.id || product._id);
    return this.selectedColors[productId] === colorIndex;
  }

  onColorSelect(product: any, colorIndex: number, newImage: string): void {
    const productId = product.uniqueId || product.id || product._id;
    
    if (!productId) {
      console.error('Product ID not found for color selection');
      return;
    }
    
    if (!newImage) {
      console.error('No image provided for color selection');
      return;
    }
    
    // Update selected color index for this specific product
    this.selectedColors[productId] = colorIndex;
    
    // Update the image tracking
    this.productImages[productId] = newImage;
    
    // Update the product's images immediately for instant feedback
    product.currentImage = newImage;
    product.imagen = newImage;
    
    // Also update the main product array for consistency
    const productIndex = this.ourProducts.findIndex((p:any) => 
      (p.uniqueId || p.id || p._id) === productId
    );
    
    if (productIndex !== -1) {
      this.ourProducts[productIndex].imagen = newImage;
      this.ourProducts[productIndex].currentImage = newImage;
      
      // Force change detection by creating a new reference
      this.ourProducts = [...this.ourProducts];
    }
    
    // Add changing animation class for visual feedback
    product.isChanging = true;
    
    // Remove animation class after short animation
    setTimeout(() => {
      product.isChanging = false;
    }, 300);
    
    // Call the parent's changeProductImage function if provided
    if (this.changeProductImage) {
      this.changeProductImage(product, newImage);
    }
    
   //✅ Color changed successfully for product ${productId} to: ${newImage}`);
  }

  changeProductImage = (product: any, imageUrl: string) => {
    this.productUIService.changeProductImage(product, imageUrl);
  }

  private checkUserAuthenticationStatus(): void {
    this.subscriptions.add(
      combineLatest([
        this.authService.user,
        this.authService.userGuest
      ]).subscribe(([user, userGuest]) => {
        const previousUser = this.currentUser;
        this.currentUser = user || userGuest; // Usa el usuario autenticado o invitado
        
        // ✅ Detectar cambios en el estado de autenticación
        if (this.currentUser) {
          console.log('✅ Header: Usuario detectado', this.currentUser.email || 'Guest');
          this.processUserStatus();  // Procesar el usuario
        } else {
          console.log('⚠️ Header: No hay usuario autenticado o invitado');
          // Limpiar carritos y wishlists cuando no hay usuario
          this.listCarts = [];
          this.listWishlists = [];
          this.totalCarts = 0;
          this.totalWishlist = 0;
        }
        
        // Forzar detección de cambios en UI
        this.cd.detectChanges();
      })
    );
  }

  private processUserStatus(): void {
    this.storeListCarts();
    this.storeListWishlists();
    // ⚠️ REMOVIDO: La migración guest→usuario ahora se maneja en login.component.ts
    // La sincronización aquí causaba el error: "sin un usuario autenticado"
  }

  private storeListCarts(): void {
    if (this.currentUser && !this.currentUser.email) { // Es un invitado
      this.listCartsLocalStorage();
    } else if (this.currentUser && this.currentUser.email) { // Está autenticado
      this.cartService.resetCart();
      this.listCartsDatabase();
    } else {
      console.warn("Error: Estado de usuario no definido");
    }
  }

  private syncUserCart(): void {
    if ( !this.currentUser || !this.currentUser._id ) {
        console.error("Error: Intentando sincronizar el carrito sin un usuario autenticado.");
        return;
    }

    const user_guest = "Guest";
    // OBTENER ARTICULOS DEL CARRITO DEL USUARIO INVITADO Y DEL USUARIO AUTENTICADO SIMULTÁNEAMENTE
    forkJoin({
        respCache: this.cartService.listCartsCache(user_guest),
        respDatabase: this.cartService.listCarts(this.currentUser._id)
    }).subscribe({
      next: ({ respCache, respDatabase }) => {
        if (respCache && respDatabase) {
          // SINCRONIZAR AMBOS CARRITOS DE FORMA ORDENADA
          // COMPROBAR Y ELIMINAR DUPLICADOS ANTES DE SINCRONIZAR
          const mergedCarts = this.mergeAndRemoveDuplicates(respDatabase.carts || [], respCache.carts || []);
          
          // SINCRONIZAR EL CARRITO CON EL BACKEND SOLO SI ES NECESARIO
          this.cartService.syncCartWithBackend(mergedCarts, this.currentUser._id).subscribe({
            next: (resp: any) => {
              console.warn("Carrito sincronizado exitosamente: ", resp);
            },
            error: (error) => {
              console.error("Error al sincronizar el carrito: ", error);
            }
          });
        }
      },
      error: (error) => {
        console.error("Error al obtener los carritos: ", error);
      }
    });
  }

  private mergeAndRemoveDuplicates(databaseCarts: any[], cacheCarts: any[]): any[] {
    const combinedCarts = [...databaseCarts, ...cacheCarts];

    // Utilizar un Set para almacenar los IDs únicos (puedes usar productId y variedadId)
    const uniqueCarts = new Map();

    combinedCarts.forEach(cart => {
        const key = `${cart.product._id}-${cart.variedad.id}`; // Crear clave única
        if (!uniqueCarts.has(key)) {
            uniqueCarts.set(key, cart);
        }
    });

    return Array.from(uniqueCarts.values());
  }

  private listCartsDatabase(): void {
    //if (!this.currentUser || !this.currentUser._id) {
    if(this.currentUser && !this.currentUser.email) {
      console.error("Error: Intentando acceder a la base de datos sin un usuario autenticado.");
      return;
    }
    this.cartService.listCarts(this.currentUser._id).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => this.cartService.changeCart(cart));
    });
  }
  
  private listCartsLocalStorage(): void {
    let user_guest = "Guest";
    this.cartService.listCartsCache(user_guest).subscribe((resp: any) => {
      resp.carts.forEach((cart: any) => this.cartService.changeCart(cart));
    });
  }

  getFinalUnitPrice(cart: any): number {
    const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);

    // Si no hay descuento aplicado, retornar precio original
    if (!cart.type_discount || !cart.discount) {
      return originalPrice;
    }

    const discountValue = parseFloat(cart.discount);
    
    // Verificar que el descuento sea válido
    if (isNaN(discountValue) || discountValue <= 0) {
      return originalPrice;
    }

    let priceAfterDiscount: number;
    
    if (cart.type_discount === 1) { 
      // Descuento porcentual
      if (cart.code_cupon) {
        // CUPONES REALES - aplicar redondeo .95
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        return this.priceCalculationService.applyRoundingTo95(priceAfterDiscount);
      } else if (cart.code_discount && !cart.code_cupon) {
        // FLASH SALE con descuento porcentual - usar el descuento como porcentaje
        if (discountValue > 100) return originalPrice;
        priceAfterDiscount = originalPrice * (1 - discountValue / 100);
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
        return this.priceCalculationService.applyRoundingTo95(priceAfterDiscount);
      } else {
        // CAMPAIGN DISCOUNTS - cart.discount contiene el PRECIO FINAL, no el porcentaje
        if (discountValue > 0 && discountValue < originalPrice) {
          // Si discount parece ser un precio final válido, aplicar .95 rounding
          return this.priceCalculationService.applyRoundingTo95(discountValue);
        } else {
          // Si no, tratar como porcentaje (fallback) y aplicar .95 rounding
          if (discountValue > 100) return originalPrice;
          priceAfterDiscount = originalPrice * (1 - discountValue / 100);
          priceAfterDiscount = Math.max(0, priceAfterDiscount);
          return this.priceCalculationService.applyRoundingTo95(priceAfterDiscount);
        }
      }
    } else if (cart.type_discount === 2) {
      // Descuento de monto fijo - Aplicar redondeo .95
      priceAfterDiscount = Math.max(0, originalPrice - discountValue);
      return this.priceCalculationService.applyRoundingTo95(priceAfterDiscount);
    } else {
      // Tipo de descuento no reconocido
      return originalPrice;
    }
  }

  hasCartItemDiscount(cart: any): boolean {
    if (!cart || !cart.discount || !cart.type_discount) return false;
    
    const discountValue = parseFloat(cart.discount);
    if (isNaN(discountValue) || discountValue <= 0) return false;
    
    // Cupones reales tienen código
    if (cart.code_cupon) return true;
    
    // Flash Sales tienen code_discount sin code_cupon
    if (cart.code_discount && !cart.code_cupon) return true;
    
    // Para campaign discounts, verificar si hay descuento real
    if (cart.type_discount === 1) {
      const originalPrice = parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
      return discountValue > 0 && discountValue < originalPrice;
    }
    
    return cart.type_discount === 2 && discountValue > 0;
  }

  getOriginalUnitPrice(cart: any): number {
    return parseFloat(cart.variedad?.retail_price || cart.price_unitario || 0);
  }

  getFormattedPrice(price: any) {
    if (typeof price === 'string') {
      price = parseFloat(price); // Convertir a número
    }
  
    if (isNaN(price)) {
      return { integerPart: "0", decimalPart: "00" }; // Manejo de error si el valor no es válido
    }
    
    const formatted = price.toFixed(2).split('.'); // Asegura siempre dos decimales
    return {
      integerPart: formatted[0], // Parte entera
      decimalPart: formatted[1]  // Parte decimal
    };
  }

  /**
   * Verifica si hay algún producto en el carrito con descuento (para usar en template)
   */
  hasAnyCartDiscount(): boolean {
    return this.listCarts.some(cart => this.hasCartItemDiscount(cart));
  }

  /**
   * Calcula el subtotal original (sin descuentos) de todos los productos
   */
  getOriginalSubtotal(): number {
    if (!this.listCarts || this.listCarts.length === 0) {
      return 0;
    }
    return this.listCarts.reduce((total: number, cart: any) => {
      const originalPrice = this.getOriginalUnitPrice(cart);
      return total + (originalPrice * cart.cantidad);
    }, 0);
  }

  /**
   * Calcula el total de descuento aplicado
   */
  getTotalDiscount(): number {
    if (!this.listCarts || this.listCarts.length === 0) {
      return 0;
    }
    return this.listCarts.reduce((total: number, cart: any) => {
      const originalPrice = this.getOriginalUnitPrice(cart);
      const finalPrice = this.getFinalUnitPrice(cart);
      const discountPerItem = Math.max(0, originalPrice - finalPrice);
      return total + (discountPerItem * cart.cantidad);
    }, 0);
  }

  /**
   * Calcula el subtotal final (con descuentos aplicados)
   */
  getSubtotal(): number {
    return this.totalCarts;
  }

  /**
   * Calcula el total final (igual al subtotal ya que no hay costos de envío)
   */
  getTotal(): number {
    return this.totalCarts;
  }
  
  private subscribeToCartData(): void {
    this.subscriptions.add(
      this.cartService.currenteDataCart$.subscribe((resp: any) => {
        this.listCarts = resp;
  
        // Recalcular total usando precio final (con descuento si aplica)
        this.totalCarts = this.listCarts.reduce((sum, item) => {
          const finalPrice = this.getFinalUnitPrice(item);
          return sum + (finalPrice * item.cantidad);
        }, 0);
        this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
      })
    );
  }

  /**
   * Obtiene la imagen correcta de la variedad (preview > default) o fallback al producto
   */
  getVarietyImage(cart: any): string {
    if (!cart.variedad?.files?.length) return cart.product.imagen;

    // Buscamos la imagen tipo 'preview'
    const preview = cart.variedad.files.find((f: any) => f.type === 'preview' && f.preview_url);
    if (preview) return preview.preview_url;

    // Buscamos la imagen tipo 'default'
    const def = cart.variedad.files.find((f: any) => f.type === 'default' && f.preview_url);
    if (def) return def.preview_url;

    // Fallback al producto
    return cart.product.imagen;
  }
  
  private storeListWishlists(): void {
    if (this.currentUser && !this.currentUser.email) { // Es un invitado
      this.listWishlistsLocalStorage();
    } else if (this.currentUser && this.currentUser.email) { // Autenticado
      this.listWishlistsDatabase();
    } else {
      console.warn("Error: Estado de usuario no definido");
    }
  }
  
  private listWishlistsDatabase(): void {
    if(this.currentUser && !this.currentUser.email) { //if (!this.currentUser || !this.currentUser._id) {
      console.error("Error: Intentando acceder a la base de datos sin un usuario autenticado.");
      return;
    }
  
    this.wishlistService.listWishlists(this.currentUser._id).subscribe((resp: any) => {
      resp.wishlists.forEach((wishlist: any) => this.wishlistService.changeWishlist(wishlist));
    });
  }
  
  private listWishlistsLocalStorage(): void {
    // Implementar la lógica para obtener los favoritos del local storage
  }

  navigateToProduct(slug: string, discountId?: string) {
    // Cerrar el offcanvas del buscador
    const searchDrawer = document.getElementById('search-drawer');
    const bsOffcanvas = (window as any).bootstrap?.Offcanvas?.getInstance(searchDrawer);
    if (bsOffcanvas) {
      bsOffcanvas.hide();
    }
    
    // Limpiar campo de búsqueda
    this.search_product = '';
    this.products_search = [];
    
    // Navegación SPA-friendly sin reload
    this.router.navigate(['/', this.country, this.locale, 'shop', 'product', slug], { queryParams: { _id: discountId } });
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;

    // Ajusta el tamaño de la imagen según el tipo de dispositivo
    if (this.isMobile) {
        this.width = 80;  // tamaño para móviles
        this.height = 80; // tamaño para móviles
    } else {
        this.width = 100; // tamaño por defecto
        this.height = 100; // tamaño por defecto
    }
  }

  private subscribeToWishlistData(): void {
    this.subscriptions.add(
      this.wishlistService.currenteDataWishlist$.subscribe((resp: any) => {
        this.listWishlists = resp;
        this.totalWishlist = this.listWishlists.reduce((sum:any, item:any) => sum + parseFloat(item.total), 0);
      })
    );
  }

  private subscribeToEcommerceConfig(): void {
    this.subscriptions.add(
      this.ecommerceGuestService.configInitial().subscribe((resp: any) => {
        this.categories = resp.categories;
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.filter) {
      this.source = fromEvent(this.filter.nativeElement, "keyup");
      this.subscriptions.add(
        this.source.pipe(debounceTime(500)).subscribe(() => {
          const value = this.search_product?.trim() || '';

          if (value.length > 1) { //if (this.search_product && this.search_product.trim().length > 1) {
            const data = { search_product: this.search_product };
            this.cartService.searchProduct(data).subscribe((resp: any) => {
              this.products_search = resp.products;
            });
          } else {
            // Si el campo está vacío o tiene un solo carácter, limpiamos los resultados
            this.products_search = [];
          }
        })
      );
    }
  }

  searchProduct() {
    // Verificar si hay un término de búsqueda válido
    if (this.search_product && this.search_product.trim().length > 1) {
      const data: any = { 
        search_product: this.search_product
      };
      
      // Agregar filtro de categoría si no es "Todas las categorías" (0)
      if (this.selected_category && this.selected_category !== '0') {
        data.categorie_id = this.selected_category;
      }
      
      this.cartService.searchProduct(data).subscribe((resp: any) => {
        this.products_search = resp.products;
        this.cd.detectChanges();
      });
    }
  }
  
  getRouterDiscount(product:any) {
    if (product.campaing_discount) {
      return {_id: product.campaing_discount._id};
    }
    return {};
  }

  getDiscountProduct(product:any) {
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount == 1) { // 1 es porcentaje
        return (product.price_usd*product.campaing_discount.discount*0.01).toFixed(2);
      } else { // 2 es moneda
        return product.campaing_discount.discount;
      }
    }
    return 0;
  }

  removeCart(cart: any) {
    // Si es un usuario autenticado
    if(this.currentUser && this.currentUser.email) {  //if(!this.currentUser?.user_guest) { 
      this.cartService.deleteCart(cart._id).subscribe((resp: any) => {
        this.cartService.removeItemCart(cart);
        if (resp.message === 403) {
          alertDanger(resp.message_text);
          return;
        }
        alertSuccess("El producto ha sido eliminado del carrito");
        this.updateTotalCarts();
      });
    } else if(this.currentUser && !this.currentUser.email) {
      this.cartService.deleteCartCache(cart._id).subscribe((resp: any) => {
        this.cartService.removeItemCart(cart);
        if (resp.message === 403) {
          alertDanger(resp.message_text);
          return;
        }
        alertSuccess("El producto ha sido eliminado del carrito");
        this.updateTotalCarts();
      });
    }
  }
  
  dec(cart: any) {
    if (!this.validateDecrement(cart)) return;
  
    this.updateCartQuantity(cart, cart.cantidad - 1);
  }
  
  inc(cart: any) {
    this.updateCartQuantity(cart, cart.cantidad + 1);
  }

  goLogin() {
    this.headerEventsService.emitForceLogin(); // Cuando quieras forzar login
  }
   
  private updateCartQuantity(cart: any, newQuantity: number) {
    cart.cantidad = newQuantity;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
  
    const cartData = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad.id : null,
      product: cart.product._id,
    };

    if( this.currentUser && !this.currentUser.email) { // Es un invitado //if(this.currentUser.user_guest) {
      this.updateGuestCart(cartData);
    } else {
      this.updateUserCart(cartData);
    }
  }

  // Actualizar carrito del usuario autenticado
  private updateUserCart(cartData: any): void {
    this.cartService.updateCart(cartData).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
      alertSuccess(resp.message_text);
      this.updateTotalCarts();
    });
  }

  // Actualizar carrito del usuario invitado
  private updateGuestCart(cartData: any): void {
    this.cartService.updateCartCache(cartData).subscribe((resp: any) => {
      if (resp.message === 403) {
        alertDanger(resp.message_text);
        return;
      }
      alertSuccess(resp.message_text);
      this.updateTotalCarts();
    });
  }

  private validateDecrement(cart: any): boolean {
    if (cart.cantidad - 1 === 0) {
      alertDanger("No puedes disminuir un producto a 0");
      return false;
    }
    return true;
  }
  
  updateTotalCarts(): void {
    // Recalcular total del minicart drawer
    this.totalCarts = this.listCarts.reduce((sum, item) => {
      const unitPrice = parseFloat(item.variedad?.retail_price ?? item.product.price_usd ?? 0);
      return sum + (unitPrice * item.cantidad);
    }, 0);
    this.totalCarts = parseFloat(this.totalCarts.toFixed(2));
  }

  goToCheckout(): void {
    this.showSubscriptionSection = false;
    this.router.navigate(['/', this.country, this.locale, 'account', 'checkout', 'resumen'], { queryParams: { initialized: true, from: 'step2' } });
  }

  logout() {
    this.authService.logout();
    this.cartService.resetCart();
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
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    } 
    cleanupHOMEINITTEMPLATE($);
  }

  closeMinicart(): void {
    this.minicartService.closeMinicart();
  }

  toggleMobileMenu(): void {
    $('.mobile-nav-wrapper').toggleClass("active");
    $('body').toggleClass("menuOn");
    $('.js-mobile-nav-toggle').toggleClass('mobile-nav--open mobile-nav--close');
    
    // Reset all submenus to closed state when opening menu
    const isOpening = $('.mobile-nav-wrapper').hasClass("active");
    if (isOpening) {
      console.log('🔄 Resetting all submenus to closed state');
      const allItems = document.querySelectorAll('.mobile-nav .lvl1');
      allItems.forEach((item) => {
        item.classList.remove('expanded', 'animating');
        const submenu = item.querySelector('ul.lvl-2, ul.lvl2');
        if (submenu) {
          submenu.classList.remove('show');
        }
      });
    }
  }
  
  closeMobileMenuAndOverlay(): void {
    // Cerrar el menú móvil
    $('.mobile-nav-wrapper').removeClass("active");
    $('body').removeClass("menuOn");
    $('.js-mobile-nav-toggle').removeClass('mobile-nav--close').addClass('mobile-nav--open');
    
    // Cerrar cualquier overlay que pueda estar activo
    $('.overlay-sidebar').removeClass('active');
  }

  toggleMobileSubmenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const clickedLink = event.currentTarget as HTMLElement;
    const parentLi = clickedLink.closest('li') as HTMLElement;
    
    if (!parentLi) {
      console.error('❌ No parent li found');
      return;
    }
    
    // Prevent multiple rapid clicks
    if (parentLi.classList.contains('animating')) {
      console.log('⏳ Already animating, skipping');
      return;
    }
    
    // Find the submenu
    const submenu = parentLi.querySelector('ul.lvl-2, ul.lvl2') as HTMLElement;
    
    if (!submenu) {
      console.error('❌ No submenu found');
      return;
    }
    
    // Check current state BEFORE any changes
    const hasExpandedClass = parentLi.classList.contains('expanded');
    const hasShowClass = submenu.classList.contains('show');
    const currentMaxHeight = window.getComputedStyle(submenu).maxHeight;
    
    console.log('📊 Current state:', {
      hasExpandedClass,
      hasShowClass,
      currentMaxHeight,
      submenuDisplay: window.getComputedStyle(submenu).display,
      submenuOpacity: window.getComputedStyle(submenu).opacity
    });
    
    // Mark as animating
    parentLi.classList.add('animating');
    
    // Close all other submenus at the same level
    const allSiblings = parentLi.parentElement?.querySelectorAll('li.lvl1');
    allSiblings?.forEach((sibling: Element) => {
      if (sibling !== parentLi) {
        sibling.classList.remove('expanded');
        sibling.classList.remove('animating');
        const siblingSubmenu = sibling.querySelector('ul.lvl-2, ul.lvl2');
        if (siblingSubmenu) {
          siblingSubmenu.classList.remove('show');
        }
      }
    });
    
    // Toggle current submenu
    const shouldOpen = !hasShowClass;
    
    if (shouldOpen) {
      console.log('✅ Opening submenu');
      parentLi.classList.add('expanded');
      submenu.classList.add('show');
      
      // Force reflow to ensure transition works
      void submenu.offsetHeight;
      
      // Verify classes were added
      setTimeout(() => {
        console.log('🔍 After opening:', {
          hasExpanded: parentLi.classList.contains('expanded'),
          hasShow: submenu.classList.contains('show'),
          maxHeight: window.getComputedStyle(submenu).maxHeight,
          opacity: window.getComputedStyle(submenu).opacity
        });
      }, 50);
    } else {
      console.log('🔒 Closing submenu');
      parentLi.classList.remove('expanded');
      submenu.classList.remove('show');
    }
    
    // Remove animating class after transition
    setTimeout(() => {
      parentLi.classList.remove('animating');
      console.log('✨ Animation complete');
    }, 400);
  }
}
