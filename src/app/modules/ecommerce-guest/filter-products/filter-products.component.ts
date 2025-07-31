import { Component, OnInit, HostListener, ViewEncapsulation, ChangeDetectorRef, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { CartService } from '../_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function pswp($: any):any;
declare function productZoom([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;
declare function priceRangeSlider():any;
declare function ModalProductDetail():any;

// ------------------ DESTRUIR DESDE EL MAIN.JS ------------------
declare function cleanupHOMEINITTEMPLATE($: any): any;
declare function cleanupSliders($: any): any;
declare function productSlider5items($: any): any;
declare function sliderRefresh(): any;

@Component({
  selector: 'app-filter-products',
  templateUrl: './filter-products.component.html',
  styleUrls: ['./filter-products.component.css'],
  encapsulation: ViewEncapsulation.None // Desactiva la encapsulación
})
export class FilterProductsComponent implements AfterViewInit, OnInit, OnDestroy {

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
  products:any = [];
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
  private subscription: Subscription = new Subscription();
  loading: boolean = false;
  logo_position_selected: string = "";
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  width: number = 100; // valor por defecto
  height: number = 100; // valor por defecto
  
  /* ------------------ CONSTRUCTOR ------------------ */
  constructor(
    private cdRef: ChangeDetectorRef,
    public _ecommerceGuestService: EcommerceGuestService,
    public _cartService: CartService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
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
      const contentWidth = window.innerWidth;
      if (contentWidth < 1999) {
        this.grid5.nativeElement.click();
      }
      if (contentWidth < 1199) {
        this.grid4.nativeElement.click();
      }
      if (contentWidth < 991) {
        this.grid3.nativeElement.click();
      }
      if (contentWidth < 767) {
        this.grid2.nativeElement.click();
      }
    }, 150);

  }
  
  /* ------------------ CYCLE INIT ------------------ */
  ngOnInit(): void {
    this.subscription =  this._ecommerceGuestService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this._ecommerceGuestService._authService.user.subscribe(user => {
      if (user) {
        this.userId = user._id;
      }
    });

    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
      this.idCategorie = resp["idCategorie"];
      console.log("---> DEBBUG: > filer.componente: slug: ", this.slug);

      if (this.idCategorie) {
        // LIMPIAR FILTROS ANTES
        this.categories_selecteds = [];
        this.variedad_selected = {_id: null};
        this.is_discount = 1;
        this.filterForCategorie(this.idCategorie); 
      }
      this.filterProduct(this.slug); // ¡Ahora sí después de aplicar la categoría!
    });

    this.configInitial();
    this.checkDeviceType();

    setTimeout(() => {
      productSlider5items($);
      // REFRESCAR EL SLIDER
      (window as any).sliderRefresh($);
    }, 150);
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
    this.subscription = this._ecommerceGuestService.configInitial().subscribe((resp:any) => {
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

  filterProduct(logo_position:string='') {
    // SE LIMPIA LOS PRODUCTOS ACTUALES
    this.products = []; 
    setTimeout(() => {
      // OBTIENE EL VALOR DEL INPUT, EJ "15 € - 100 €"
      let priceRange = $("#amount").val();
      if (!priceRange) {
        console.error("El input #amount no tiene valor definido.");
        return;
      }
      
      // ELIMINA TODOS LOS '$'
      let priceArray = priceRange.replace(/\$/g, "").split(" - ");

      // ESTABLECEMOS LOS VALORES PREDETERMINADOS DEL SLIDER
      let defaultMin = 15;
      let defaultMax = 100;

      // CONVERTIMOS LOS VALORES DEL PRECIO
      let priceMin = priceArray[0] ? parseFloat(priceArray[0].trim()) : null;
      let priceMax = priceArray[1] ? parseFloat(priceArray[1].trim()) : null;

      if (logo_position && logo_position !== '') {
          if (logo_position == 'camisetas-logo-central') {
            this.logo_position_selected = 'center';
          } else if (logo_position == 'camisetas-logo-lateral') {
            this.logo_position_selected = 'right_top';
          }            
        }

      // ACTUALIZA LA VARIABLE FILTERAPPLIED
      // LA LÓGICA REVISA SI LOS VALORES DE PRECIO SON DIFERENTES DE LOS PREDETERMINADOS
      this.filtersApplied = this.categories_selecteds.length > 0 || this.selectedColors.length > 0 || this.variedad_selected.length > 0 || this.variedad_selected != '' || priceMin !== defaultMin || priceMax !== defaultMax || this.logo_position_selected !== '' ;

      let data = {
        categories_selecteds  : this.categories_selecteds,
        is_discount           : this.is_discount,
        variedad_selected     : this.variedad_selected.id ? this.variedad_selected : null,
        price_min             : priceMin,
        price_max             : priceMax,
        selectedColors        : this.selectedColors, 
        logo_position_selected: this.logo_position_selected // center_top or right_top
      }

      // LLAMADA AL SERVICIO PARA OBTENER LOS PRODUCTOS FILTRADOS
      this._ecommerceGuestService.filterProduct(data).subscribe((resp:any) => {
        this.products = resp.products;

         if (this.products) {
          this.setColoresDisponibles();
        }
        console.log("---> DEBBUG: > gett products filter: ", this.products);
        
      });
    }, 500);
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

  getPriceParts(price: number) {
    const [integer, decimals] = price.toFixed(2).split('.');
    return { integer, decimals };
  }
  

  //setColoresDisponibles() {
  //  const uniqueColors = new Map<string, string>();
  //  this.variedades.forEach((variedad: any) => {
  //    const colorName = variedad.color;
  //    if (!uniqueColors.has(colorName)) {
  //      const colorHex = this.getColorHex(colorName);
  //      uniqueColors.set(colorName, colorHex);
  //    }
  //  });
  
    // CONVERTIMOS EL MAP A UN ARRAY
  //  const coloresDisponibles = Array.from(uniqueColors, ([name, hex]) => ({ name, hex }));  
    // PUEDES ASIGNARLO A UNA VARIABLE SI ES NECESARIO
  //  this.coloresDisponibles = coloresDisponibles;
  //}
  
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
    };

    // DEVUELVE EL VALOR HEX CORRESPONDIENTE AL COLOR
    return colorMap[color] || '';
  }

  filterForCategorie(idCategorie:any) {
    let index = this.categories_selecteds.findIndex((item:any) => item === Number(idCategorie) );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds.push(idCategorie);
    }
    this.nameCategorie = this.slug;
    this.noneSidebar = false;
    this.idCategorie = idCategorie;
    this.updateCategoryTitle();
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
    this.selectedColors = [];
    this.selectedColors.push(colorName);
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
    console.log( typeof this.variedad_selected);
    
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
    if ($("#qty-cart").val() == 0) {
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
      user: this.userId,//this._cartService._authService.user._id,
      product: product._id,
      type_discount: type_discount,
      discount: discount,
      cantidad: 1,
      variedad: null,
      code_cupon: null,
      code_discount: code_discount,
      price_unitario: product.price_usd,
      subtotal: product.price_usd - this.getDiscountProduct(product),  //*1,
      total: (product.price_usd - this.getDiscountProduct(product))*1, // De momento es igual, luego aplicamos el descuento
    }

    this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        alertDanger(resp.message_text);
          return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto se ha agregado correctamente al carrito");
      }
    }, error => {
      console.log(error);
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        console.log("el token expiro...");
        this._cartService._authService.logout();
      }
    });
  }

  openModal(product:any) {
  console.log(product);
  
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
    //this.categories_selecteds = [];
    this.variedad_selected = { _id: null };
    this.is_discount = 1;
    this.variedad_selected = [];
    this.selectedColors = [];
    $("#slider-range").slider("values", [15, 100]); // Restablecer el slider (ajusta los valores según tu configuración)
    $("#amount").val("15.00 € - 100.00 €"); // Actualizar el valor del input del rango de precios
    this.filtersApplied = false; // Deshabilitar el botón
    this.filterProduct();
  }
  
  applyAnyFilter() {
    this.filtersApplied = true;
    this.filterProduct();
  }

  /* ------------------ DESTROY ------------------ */
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    cleanupSliders($);
    cleanupHOMEINITTEMPLATE($);
  }

  @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.checkDeviceType(); // Verifica el tamaño de la pantalla
    } 
}
