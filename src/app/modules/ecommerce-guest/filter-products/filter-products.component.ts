import { Component, OnInit, HostListener, ViewEncapsulation, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { CartService } from '../_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { ProductDisplayService } from '../_service/service_landing_product';
import { AuthService } from '../../auth-profile/_services/auth.service';
import { SeoService } from 'src/app/services/seo.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { GridViewMode, GridViewService } from '../../home/_services/product/grid-view.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function pswp($: any):any;
declare function productZoom([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;
declare function priceRangeSlider():any;
declare function ModalProductDetail():any;
// Función global del slider de categorías (definida en main.js)
//declare var collection_slider_8items: any;

// ------------------ DESTRUIR DESDE EL MAIN.JS ------------------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupSliders($: any): any;
declare function productSlider5items($: any): any;
declare function productSlider8items($: any): any; 
declare function sliderRefresh(): any;

@Component({
  selector: 'app-filter-products',
  templateUrl: './filter-products.component.html',
  styleUrls: ['./filter-products.component.css'],
  encapsulation: ViewEncapsulation.None // Desactiva la encapsulación
})
export class FilterProductsComponent implements OnInit, OnDestroy {

  /* ------------------ PROPERTIES  ------------------ */
  @ViewChild('grid1') grid1!: ElementRef;
  @ViewChild('grid2') grid2!: ElementRef;
  @ViewChild('grid3') grid3!: ElementRef;
  @ViewChild('grid4') grid4!: ElementRef;
  @ViewChild('grid5') grid5!: ElementRef;
  
  euro = "€";
  categories:any=[];
  variedades:any=[];
  categories_selecteds:any = [];
  is_discount:any = 1; // 1 ES NORMAL, Y 2 ES PRODUCTO CON DESCUENTO
  variedad_selected:any = {_id: null};
  products: any[] = [];
  product_selected:any=null;
  categoryTitle: string = '';
  slug:any=null;
  
  isDesktopSize: boolean = window.innerWidth >= 992;
  isMobileSize: boolean = window.innerWidth < 768;
  idCategorie:any=null;
  noneSidebar = true;
  nameCategorie = null;
  userId: any;
  selectedColors: string[] = [];
  coloresDisponibles: { name: string, hex: string }[] = [];
  filtersApplied = false; // DESHABILITAR POR DEFECTO
  locale: string = "";
  country: string = "";
  //  private subscription: Subscription = new Subscription();
  private subscriptions: Subscription = new Subscription();
  logo_position:any=null;
  logo_position_selected: string = "";
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  width: number = 100; // valor por defecto
  height: number = 100; // valor por defecto
  CURRENT_USER_AUTHENTICATED: any = null;
  CURRENT_USER_GUEST: any = null;
  currentUser: any = null;
  
  // Properties for additional filtering
  showOnlyDiscounted: boolean = false;
  searchQuery: string = '';

  currentGridView: GridViewMode = { columns: 4, type: 'grid', className: 'grid-4-col' };
  
  /* ------------------ CONSTRUCTOR ------------------ */
  constructor(
    private gridViewService: GridViewService,
    public _ecommerceGuestService: EcommerceGuestService,
    public _cartService: CartService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public loader: LoaderService,
    public productDisplayService: ProductDisplayService,
     public _authService: AuthService,
     private cdr: ChangeDetectorRef,
     private ngZone: NgZone,
     private seoService: SeoService,
     private localizationService: LocalizationService
  ) {

    this.currentGridView = this.gridViewService.getCurrentView();
    
    this._routerActived.paramMap.subscribe(params => {
      // VALORES PREDETERMINADO SI NO SE ENCUENTRA
      this.locale = params.get('locale') || 'es';
      this.country = params.get('country') || 'es';
    });

  }


  
  /* ------------------ CYCLE INIT ------------------ */
  ngOnInit(): void {

    this.subscribeToServiceStates();
    this.verifyAuthenticatedUser()

    // Subscribe to LocalizationService for reactive country/locale updates
    this.subscriptions.add(
      this.localizationService.country$.subscribe(country => {
        this.country = country;
      })
    );

    this.subscriptions.add(
      this.localizationService.locale$.subscribe(locale => {
        this.locale = locale;
      })
    );

    this._ecommerceGuestService._authService.user.subscribe(user => {
      if (user) {
        this.userId = user._id;
      }
    });

    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
      this.logo_position = resp["logo_position"];
      
      this.idCategorie = resp["idCategorie"];
      
      if (this.idCategorie && this.slug && this.slug != '') {
        // LIMPIAR FILTROS ANTES
        this.categories_selecteds = [];
        this.variedad_selected = {_id: null};
        this.is_discount = 1;
        this.filterForCategorie(this.idCategorie);
      } 

      this.filterProduct(this.logo_position); // Aplicar filtros (principalmente categoría) sin tratar slug como posición de logo
      
    });

    this.configInitial();
    this.checkDeviceType();
    this.setupSEO();
    this.subscribeToGridViewChanges();
    

    // Slider initialization handled by loader subscription

    // Initialize UI components after loading completes
    this.initializePostLoadTasks();
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


  private subscribeToServiceStates(): void {
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

  openSidebar() {
    this.noneSidebar = false;
  }
  closeSidebar() {
    this.noneSidebar = true;
  }

  private subscribeToGridViewChanges(): void {
    const serviceId = (this.gridViewService as any).serviceId;
    
    const subscription = this.gridViewService.currentView$.subscribe({
      next: (view) => {
        console.log('🔔 Filter-Products: Service [' + serviceId + '] emitted new view:', view);
        this.currentGridView = view;
        console.log('✅ Filter-Products: currentGridView updated to:', this.currentGridView);
        this.updateGridViewUI();
        this.cdr.detectChanges();
        console.log('🔄 Filter-Products: Change detection triggered');
      },
      error: (err) => {
        console.error('❌ Filter-Products: Subscription error:', err);
      },
      complete: () => {
        console.log('🏁 Filter-Products: Subscription completed');
      }
    });
    this.subscriptions.add(subscription);
  }

  // Grid View Methods
  setGridView(columns: number): void {
    
    // Actualizar el servicio Y obtener el valor directamente
    this.gridViewService.setGridView(columns);
    
    // Obtener el valor actual inmediatamente del BehaviorSubject privado
    const currentValue = (this.gridViewService as any)['currentViewSubject']?.getValue();
      
    if (currentValue) {
      this.currentGridView = currentValue;
      this.updateGridViewUI();
      this.cdr.detectChanges();
      
    }
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

   /* ------------------ INIT FUCTIONS ------------------ */
  configInitial() {
    this.subscriptions = this._ecommerceGuestService.configInitial().subscribe((resp:any) => {
      this.categories = resp.categories;
      
      // GENERAR SLUG PARA CASA CATEGORIA SIN MODIFICAR EL TITULO ORIGINAL
      this.categories.forEach((category:any) => {
        // GENERA EL SLUG Y LO AGREGA AL OBJETO CATEGORIA
        category.slug = this.generateSlug(category.title);
      });

      // BUSCAR EL TITULO DE LA CATEGORIA BASADA EN EL IDCATEGORIE
      const category = this.categories.find((cat:any) => cat._id === Number(this.idCategorie));
    
      if (category) {
        // ASIGNCAR EL TITULO DE LA CATEGORIA
        this.categoryTitle = category.title;
      }

      // ACTUALIZAR EL TITULO UNA VEZ CARGADAS LAS CATEGORIAS
      this.updateCategoryTitle();

      this.variedades = resp.variedades;

      if (this.variedades) {
        this.setColoresDisponibles();
      }
      
      const variedadesUnicos = new Set();
      this.variedades = this.variedades.filter((variedad:any) => {
        if (variedadesUnicos.has(variedad.valor)) {
          return false;
        } else {
          variedadesUnicos.add(variedad.valor);
          return true;
        }
      });
    });
  }

  filterProduct(logo_position: string = '', priceRange?: string) {
    this.products = [];
    setTimeout(() => {
      // Lógica de filtrado de precio: omitir rango si hay categoría seleccionada
      const defaultMin = 15;
      const defaultMax = 100;
      let priceMin: number | null = null;
      let priceMax: number | null = null;
      if (priceRange) {
        const priceArray = priceRange.replace(/\$/g, "").split(" - ");
        priceMin = priceArray[0] ? parseFloat(priceArray[0].trim()) : null;
        priceMax = priceArray[1] ? parseFloat(priceArray[1].trim()) : null;
      } else if (this.categories_selecteds.length > 0) {
        // Filtrado inicial por categoría: no aplicar filtro de precio
        priceMin = 0;
        priceMax = 0;
      } else {
        // Rango predeterminado
        priceMin = defaultMin;
        priceMax = defaultMax;
      }

      //if (!logo_position) return; // Si logo_position no está definido, salir de la función
      
      if (logo_position && logo_position !== '') {
        if (logo_position === 'logo-central') {
          this.logo_position_selected = 'center';
        } else if (logo_position == 'logo-lateral') {
          this.logo_position_selected = 'right_top';
        }
      }

      this.filtersApplied = this.categories_selecteds.length > 0 || this.selectedColors.length > 0 || this.variedad_selected.length > 0 || this.variedad_selected != '' || priceMin !== defaultMin || priceMax !== defaultMax || this.logo_position_selected !== '';

      let data = {
        categories_selecteds: this.categories_selecteds,
        is_discount: this.is_discount,
        variedad_selected: this.variedad_selected.id ? this.variedad_selected : null,
        price_min: priceMin,
        price_max: priceMax,
        selectedColors: this.selectedColors,
        logo_position_selected: this.logo_position_selected
      };
      
      this._ecommerceGuestService.filterProduct(data).subscribe((resp: any) => {
        this.products = resp.products;
        
        // Apply frontend filters after backend response
        if (this.showOnlyDiscounted && this.products) {
          this.products = this.filterProductsWithDiscounts(this.products);
        }
        
        if (this.searchQuery && this.searchQuery.trim() && this.products) {
          this.products = this.filterProductsBySearch(this.products, this.searchQuery);
        }
        
        if (this.products) {
          this.setColoresDisponibles();
        }
      });
    }, 500);
  }

  onFilterByPrice(priceRange: string) {
    // Clear other filters when applying price filter for independent exploration
    this.categories_selecteds = [];
    this.selectedColors = [];
    this.variedad_selected = {id: null};
    this.searchQuery = '';
    this.showOnlyDiscounted = false;
    
    this.filterProduct('', priceRange);
  }

  changeProductImage(product: any, imageUrl: string) {
    product.imagen = imageUrl; 
  }

   setColoresDisponibles() {
     this.products.forEach((product: any) => {
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

  // setColoresDisponibles() {
  //   // Delegar al servicio especializado
  //   this.productDisplayService.setColoresDisponibles(this.product_selected);
  // }

  getPriceParts(price: number) {
    const [integer, decimals] = price.toFixed(2).split('.');
    return { integer, decimals };
  }
  
  getColorHex(color: string): string {
    // MAPEA LOS NOMBRES DE LOS COLORES A SUS VALORES HEXADECIMALES CORRESPONDIENTE
    const colorMap: { [key: string]: string } = {
      'Faded Black' : '#424242',
      'Faded Khaki' : '#dbc4a2',
      'Black'       : '#080808',
      'Navy'        : '#152438',
      'Maroon'      : '#6c152b',
      'Red'         : '#e41525',
      'Royal'       : '#1652ac',
      'Sport Grey'  : '#9b969c',
      'Light blue'  : '#9dbfe2',
      'Faded Eucalyptus': '#d1cbad',
      'Faded Bone'  : '#f3ede4',
      'White'       : '#ffffff',
      'Leaf'        : '#5c9346',
      'Autumn'      : '#c85313',
      // Nuevos colores encontrados en los logs
      'Carbon Grey': '#36454f',
      'Bone': '#e3dac3',
    };

    // DEVUELVE EL VALOR HEX CORRESPONDIENTE AL COLOR
    return colorMap[color] || '';
  }

  filterForCategorie(idCategorie:any) {
    let index = this.categories_selecteds.findIndex((item:any) => item === Number(idCategorie) );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds.push(Number(idCategorie));
      
    }
    this.nameCategorie = this.slug;
    this.idCategorie = idCategorie;
    
    
    this.updateCategoryTitle();

    this.filterProduct();
    this.updateSEOForFilters();
  }

  addCategorie(categorie:any) {
    let index = this.categories_selecteds.findIndex((item:any) => item == categorie._id );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds = [];
      this.categories_selecteds.push(categorie._id);
    }
    this.filterProduct();
    this.updateSEOForFilters();
  }

  toggleColor(colorName: string) {
    // Clear other filters when applying color filter for independent exploration
    this.categories_selecteds = [];
    this.variedad_selected = {id: null};
    this.searchQuery = '';
    this.showOnlyDiscounted = false;
    
    this.selectedColors = [colorName];
    this.filterProduct();
  }

  // Methods for sidebar filters
  onDiscountFilter(showOnlyDiscounted: boolean) {
    // Clear other filters when applying discount filter for independent exploration
    this.categories_selecteds = [];
    this.selectedColors = [];
    this.variedad_selected = {id: null};
    this.searchQuery = '';
    
    this.showOnlyDiscounted = showOnlyDiscounted;
    this.filterProduct();
  }

  onCategoryFilter(categoryIds: number[]) {
    // Clear other filters when applying category filter for independent exploration
    this.selectedColors = [];
    this.variedad_selected = {id: null};
    this.searchQuery = '';
    this.showOnlyDiscounted = false;
    
    this.categories_selecteds = categoryIds;
    this.filterProduct();
  }

  onSearchProducts(searchQuery: string) {
    this.searchQuery = searchQuery;
    this.filterProduct();
  }

  onSortProducts(sortBy: string) {
    if (!this.products || this.products.length === 0) return;

    const sortedProducts = [...this.products].sort((a, b) => {
      switch (sortBy) {
        case 'title-ascending':
          const titleA = (a.title || '').toLowerCase();
          const titleB = (b.title || '').toLowerCase();
          return titleA.localeCompare(titleB);
        
        case 'title-descending':
          const titleDescA = (a.title || '').toLowerCase();
          const titleDescB = (b.title || '').toLowerCase();
          return titleDescB.localeCompare(titleDescA);
        
        case 'price-ascending':
          const priceA = this.getProductPrice(a);
          const priceB = this.getProductPrice(b);
          return priceA - priceB;
        
        case 'price-descending':
          const priceDescA = this.getProductPrice(a);
          const priceDescB = this.getProductPrice(b);
          return priceDescB - priceDescA;
        
        case 'created-ascending':
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        
        case 'created-descending':
          const dateDescA = new Date(a.created_at || 0).getTime();
          const dateDescB = new Date(b.created_at || 0).getTime();
          return dateDescB - dateDescA;
        
        case 'featured':
        default:
          // Default order (as received from backend)
          return 0;
      }
    });

    this.products = sortedProducts;
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  // Helper method to get product price considering discounts
  private getProductPrice(product: any): number {
    if (product.campaing_discount && product.campaing_discount.discount) {
      const discount = product.campaing_discount.discount;
      const originalPrice = parseFloat(product.price_eur) || 0;
      
      if (product.campaing_discount.type_discount === 1) {
        // Percentage discount
        return originalPrice * (1 - discount / 100);
      } else {
        // Fixed amount discount
        return originalPrice - discount;
      }
    }
    
    return parseFloat(product.price_eur) || 0;
  }

  // Frontend filtering methods
  filterProductsWithDiscounts(products: any[]): any[] {
    const currentTime = new Date().getTime();
    
    return products.filter(product => {
      // Check for active campaign discount
      if (product.campaing_discount && (product.campaing_discount.id || product.campaing_discount._id)) {
        // Verify campaign is currently active
        if (product.campaing_discount.start_date_num && product.campaing_discount.end_date_num) {
          const isActive = currentTime >= product.campaing_discount.start_date_num && 
                          currentTime <= product.campaing_discount.end_date_num;
          if (isActive && product.campaing_discount.state === 1) {
            return true;
          }
        }
      }
      
      // Check for flash sales
      if (product.code_discount) {
        return true;
      }
      
      // Check if product has any discount fields
      if (product.discount && product.discount > 0) {
        return true;
      }
      
      return false;
    });
  }

  filterProductsBySearch(products: any[], searchQuery: string): any[] {
    const query = searchQuery.toLowerCase().trim();
    
    return products.filter(product => {
      // Search in product title
      if (product.title && product.title.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in product description
      if (product.descripcion && product.descripcion.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in category title
      if (product.categorie && product.categorie.title && 
          product.categorie.title.toLowerCase().includes(query)) {
        return true;
      }
      
      return false;
    });
  }


  
  updateCategoryTitle() {
    const category = this.categories.find((cat:any) => cat._id === Number(this.idCategorie));
    if (category) {
      this.categoryTitle = category.title;
    } else {
      this.categoryTitle = '';
    }
  }
  
  selectedDiscount(value: number) {
    this.is_discount = value;
    this.filterProduct();
  }

  selectedVariedad(variedad:any) {
    // Clear other filters when applying size filter for independent exploration
    this.categories_selecteds = [];
    this.selectedColors = [];
    this.searchQuery = '';
    this.showOnlyDiscounted = false;
    
    this.variedad_selected = variedad;
    this.filterProduct();
  }

  getRouterDiscount(product:any) {
    if (product.campaing_discount) {
      return {_id: product.campaing_discount._id};
    }
    return {};
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()                  // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '')     // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-')            // Reemplazar los espacios por guiones
      .replace(/-+/g, '-');            // Reemplazar múltiples guiones por uno solo
  }

  getDiscountProduct(product:any) {
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount == 1) { // 1 porcentaje
        return product.price_usd*product.campaing_discount.discount*0.01;
      } else { // 2 es moneda
        return product.campaing_discount.discount;
      }
    }
    return 0;
  }

  addCart(product:any, is_sale_flash:any=null) {
    if (!this._cartService._authService.user) {
      alertDanger("Necesitas autenticarte para poder agregar el producto al carrito");
      return;
    }
    if ( $("#qty-cart").val() == 0) {
      alertDanger("Necesitas agregar una cantidad mayor a 0 para el carrito");
      return;
    }
    //if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
      // let LINK_DISCOUNT = "";
      // if (is_sale_flash) {
      //   LINK_DISCOUNT = "?_id="+this.FlashSale._id;
      // } else { // Si el producto es de inventario unitario, se envia el producto de manera directa al carrito
      //   if (product.campaing_discount) {
      //     LINK_DISCOUNT = "?_id="+product.campaing_discount._id;
      //   }
      // }
      //this._router.navigateByUrl("/landing-product/"+product.slug);
      //return;
    //}
    if (product.type_inventario == 2) { // Si el producto tiene variedad multiple, entonces redirigir a la landing de product para que de esa manera el cliente pueda seleccionar la variedad (talla)
      let LINK_DISCOUNT = "?_id="+product.campaing_discount._id;
      this._router.navigateByUrl("/landing-product/"+product.slug+LINK_DISCOUNT);
      return;
    }

    let type_discount = null;
    let discount = 0;
    let code_discount = null;
    let type_campaign = null;
    
    if (product.campaing_discount) {
      type_discount  = product.campaing_discount.type_discount;
      discount = product.campaing_discount.discount;
      code_discount = product.campaing_discount._id || product.campaing_discount.id;
      type_campaign = product.campaing_discount.type_campaign; // ✅ Enviamos type_campaign explícitamente
    }
   
    let data = {
      user: this.userId,
      product: product._id,
      type_discount: type_discount,
      discount: discount,
      cantidad: 1,
      variedad: null,
      code_cupon: null,
      code_discount: code_discount,
      type_campaign: type_campaign, // ✅ Incluimos type_campaign en los datos
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscountProduct(product),  
      total: (product.price_usd - this.getDiscountProduct(product))*1, // De momento es igual, luego aplicamos el descuento
    };

    this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto se ha agregado correctamente al carrito");
      }
    }, error => {
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        
        this._cartService._authService.logout();
      }
    });
  }

  openModal(product:any) {
    this.product_selected = null;
    setTimeout(() => {
      this.product_selected = product;
      setTimeout(() => {
        ModalProductDetail();
      }, 50);
    }, 150);
  }

  getCalNewPrice(product:any) {
    if (product.campaing_discount) {
      if (product.campaing_discount.type_discount == 1) {
        return product.price_usd - product.price_usd*product.campaing_discount.discount*0.01;
      } else {
        return product.price_usd - product.campaing_discount.discount;
      }
    }
    return 0;
  }

  clearFilters() {
    this.variedad_selected = { _id: null };
    this.is_discount = 1;
    this.selectedColors = [];
    this.categories_selecteds = [];
    // Clear additional filters
    this.showOnlyDiscounted = false;
    this.searchQuery = '';
    // Si tienes lógica de UI para el slider de precio, deberías moverla a un Output del sidebar si el control está ahí
    this.filtersApplied = false;
    this.filterProduct();
  }
  
  applyAnyFilter() {
    this.filtersApplied = true;
    this.filterProduct();
  }

  /* ------------------ DESTROY ------------------ */
  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    cleanupSliders($);
    cleanupHOMEINITTEMPLATE($);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkDeviceType(); // Verifica el tamaño de la pantalla
  }

  /**
   * Initialize tasks after page loading completes
   */
  private initializePostLoadTasks(): void {
    this.subscriptions.add(
      this.loader.loading$.subscribe((isLoading) => {
        if (!isLoading) {
          setTimeout(() => {
            this.initializeUIComponents();
          }, 500);
        }
      })
    );
  }

  /**
   * Initialize UI components like templates and sliders
   */
  private initializeUIComponents(): void {
    if (typeof HOMEINITTEMPLATE !== "undefined") {
      HOMEINITTEMPLATE($);
    }
    if (typeof productSlider5items !== "undefined") {
      productSlider5items($);
    }
    if (typeof productSlider8items !== "undefined") {
      productSlider8items($);
    }
  }

  /**
   * Configura SEO dinámico para la página de filtros/categoría
   */
  setupSEO(): void {
    // Obtener información de la categoría actual
    const currentCategory = this.categories.find((cat: any) => cat._id === this.idCategorie);
    const categoryName = currentCategory?.title || 'Developer Products';
    const isFilterActive = this.categories_selecteds.length > 0 || this.variedad_selected._id;
    
    let title: string;
    let description: string;
    let keywords: string[] = [];

    if (isFilterActive) {
      // SEO para página con filtros activos
      title = `Filtered ${categoryName} | Developer Merch Collection`;
      description = `Discover curated ${categoryName.toLowerCase()} for developers and programmers. Find the perfect coding apparel and developer merchandise.`;
      keywords = [
        'filtered developer merch',
        'curated programmer products',
        `${categoryName.toLowerCase()} collection`,
        'developer product search',
        'programming merchandise filter'
      ];
    } else if (categoryName !== 'Developer Products') {
      // SEO específico para categoría
      title = `${categoryName} | Developer Merch & Programming Apparel`;
      description = `Shop ${categoryName.toLowerCase()} designed for developers, programmers, and coding enthusiasts. Premium quality developer merchandise and programming apparel.`;
      keywords = this.generateCategoryKeywords(categoryName);
    } else {
      // SEO general para página de productos
      title = 'Developer Merchandise & Programming Apparel Collection';
      description = 'Browse our complete collection of developer merchandise, programming t-shirts, coding hoodies, and funny developer gifts for software engineers.';
      keywords = [
        'developer merchandise collection',
        'programming apparel browse',
        'coding t-shirts catalog',
        'developer products shop',
        'programmer clothing store'
      ];
    }

    // Llamar al servicio SEO
    this.seoService.updateSeo({
      title,
      description,
      keywords: [...keywords, ...this.getBaseKeywords()],
      image: '/assets/img/categories/' + (categoryName.toLowerCase().replace(/ /g, '-')) + '.jpg',
      type: 'category'
    });
  }

  /**
   * Genera keywords específicos por categoría
   */
  private generateCategoryKeywords(categoryName: string): string[] {
    const categoryKeywords: { [key: string]: string[] } = {
      'programming humor': ['funny programming shirts', 'coding jokes apparel', 'developer humor collection'],
      'javascript': ['javascript developer shirts', 'js programmer apparel', 'node.js merchandise'],
      'python': ['python programmer shirts', 'python developer apparel', 'snake code merchandise'],
      'react': ['react developer shirts', 'react.js apparel', 'frontend developer merch'],
      'backend': ['backend developer shirts', 'server side apparel', 'api developer merch'],
      'frontend': ['frontend developer shirts', 'ui developer apparel', 'web developer merch'],
      'full stack': ['fullstack developer shirts', 'complete developer apparel', 'end-to-end dev merch']
    };

    const key = categoryName.toLowerCase();
    return categoryKeywords[key] || [
      `${categoryName.toLowerCase()} developer shirts`,
      `${categoryName.toLowerCase()} programmer apparel`,
      `${categoryName.toLowerCase()} coding merchandise`
    ];
  }

  /**
   * Obtiene keywords base para todas las páginas de categoría
   */
  private getBaseKeywords(): string[] {
    return [
      'developer merch',
      'programmer shirts',
      'coding apparel',
      'developer gifts',
      'programming merchandise'
    ];
  }

  /**
   * Actualiza SEO cuando cambian los filtros
   */
  updateSEOForFilters(): void {
    // Llamar a setupSEO para recalcular con los nuevos filtros
    setTimeout(() => {
      this.setupSEO();
    }, 100);
  }
}
