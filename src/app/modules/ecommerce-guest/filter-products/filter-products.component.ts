import { Component, OnInit, HostListener, ViewEncapsulation, ChangeDetectorRef, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { CartService } from '../_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { ProductDisplayService } from '../_service/service_landing_product';
import { AuthService } from '../../auth-profile/_services/auth.service';

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
export class FilterProductsComponent implements AfterViewInit, OnInit, OnDestroy {

  /* ------------------ PROPERTIES  ------------------ */
  // @ViewChild('grid1') grid1!: ElementRef;
  // @ViewChild('grid2') grid2!: ElementRef;
  // @ViewChild('grid3') grid3!: ElementRef;
  // @ViewChild('grid4') grid4!: ElementRef;
  // @ViewChild('grid5') grid5!: ElementRef;
  
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
  
  /* ------------------ CONSTRUCTOR ------------------ */
  constructor(
    private cdRef: ChangeDetectorRef,
    public _ecommerceGuestService: EcommerceGuestService,
    public _cartService: CartService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public loader: LoaderService,
    public productDisplayService: ProductDisplayService,
     public _authService: AuthService,
  ) {
    
    this._routerActived.paramMap.subscribe(params => {
      // VALORES PREDETERMINADO SI NO SE ENCUENTRA
      this.locale = params.get('locale') || 'es';
      this.country = params.get('country') || 'es';
    });

  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      HOMEINITTEMPLATE($);
      // Lógica de gridX eliminada porque los elementos ya no existen en el padre
    }, 150);

  }
  
  /* ------------------ CYCLE INIT ------------------ */
  ngOnInit(): void {

    this.subscribeToServiceStates();
    this.verifyAuthenticatedUser()

    this._ecommerceGuestService._authService.user.subscribe(user => {
      if (user) {
        this.userId = user._id;
      }
    });

    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
      this.logo_position = resp["logo_position"];
      console.log("------> this.logo_position", this.logo_position);
      
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
    

    // Slider initialization handled by loader subscription

    // Subscribe to loader to initialize and cleanup sliders
    this.subscriptions.add(
      this.loader.loading$.subscribe(isLoading => {
        if (!isLoading) {
          setTimeout(() => {
            productSlider5items($);
            productSlider8items($);
            (window as any).sliderRefresh($);
          }, 150);
        } else {
          cleanupHOMEINITTEMPLATE($);
          cleanupSliders($);
        }
      })
    );
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
        
        if (this.products) {
          this.setColoresDisponibles();
        }
      });
    }, 500);
  }

  onFilterByPrice(priceRange: string) {
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
  }

  toggleColor(colorName: string) {
    this.selectedColors = [colorName];
    this.filterProduct();
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
    
    if (product.campaing_discount) {
      type_discount  = product.campaing_discount.type_discount;
      discount = product.campaing_discount.discount;
      code_discount = product.campaing_discount._id;
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
        console.log("🛑 [DEBUG][FilterProductsComponent] El token expiró. Usuario será deslogueado. Detalle:", error);
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
}
