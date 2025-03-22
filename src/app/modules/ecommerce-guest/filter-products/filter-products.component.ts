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

// ---------- Destruir desde main ----------
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
  @ViewChild('grid1') grid1!: ElementRef;
  @ViewChild('grid2') grid2!: ElementRef;
  @ViewChild('grid3') grid3!: ElementRef;
  @ViewChild('grid4') grid4!: ElementRef;
  @ViewChild('grid5') grid5!: ElementRef;
  
  euro = "€";
  categories:any=[];
  variedades:any=[];
  categories_selecteds:any = [];
  is_discount:any = 1; // 1 es normal,  y 2 es producto con descuento
  variedad_selected:any = {_id: null};
  products:any = [];
  product_selected:any=null;
  categoryTitle: string = '';
  slug:any=null;
  isDesktopSize: boolean = window.innerWidth >= 992; // Inicialización
  isMobileSize: boolean = window.innerWidth < 768;
  idCategorie:any=null;
  noneSidebar = true;
  nameCategorie = null;
  userId: any;

  tallas: any[] = [];  // Aquí guardaremos las tallas disponibles
  //selectedTallas: any[] = [];  // Aquí guardamos las tallas seleccionadas

  selectedColors: string[] = [];
  coloresDisponibles: { name: string, hex: string }[] = [];
  filtersApplied = false; // Deshabilitado por defecto

  locale: string = "";
  country: string = "";

  private subscription: Subscription = new Subscription();
  loading: boolean = false;
  
  constructor(
    private cdRef: ChangeDetectorRef,
    public _ecommerceGuestService: EcommerceGuestService,
    public _cartService: CartService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
  ) {
    
    this._routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
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

      if (this.idCategorie) {
        // Limpiar filtros antes
        this.categories_selecteds = [];
        this.variedad_selected = {_id: null};
        this.is_discount = 1;

        this.filterForCategorie(this.idCategorie); 
      }

      this.filterProduct(); // ¡Ahora sí después de aplicar la categoría!
    });

    this.subscription = this._ecommerceGuestService.configInitial().subscribe((resp:any) => {

      this.categories = resp.categories;
  
      // Generar slug para cada categoría sin modificar el título original
      this.categories.forEach((category:any) => {
        category.slug = this.generateSlug(category.title);  // Genera el slug y lo agrega al objeto categoria
      });

      // Buscar el título de la categoría basada en el idCategorie
      const category = this.categories.find((cat:any) => cat._id === Number(this.idCategorie));
      if (category) {
        this.categoryTitle = category.title; // Asignar el título de la categoría
      }

      // Actualizar título una vez cargadas las categorías
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

     setTimeout(() => {
      productSlider5items($);
      // Llama explícitamente al refresco del slider
      (window as any).sliderRefresh($);
     }, 50);

  }

  setColoresDisponibles() {
    const uniqueColors = new Map<string, string>();
    this.variedades.forEach((variedad: any) => {
      const colorName = variedad.color;
      if (!uniqueColors.has(colorName)) {
        const colorHex = this.getColorHex(colorName);
        uniqueColors.set(colorName, colorHex);
      }
    });
  
    // Convertimos el Map a un array si lo quieres así:
    const coloresDisponibles = Array.from(uniqueColors, ([name, hex]) => ({ name, hex }));  
    // Puedes asignarlo a una variable si es necesario:
    this.coloresDisponibles = coloresDisponibles;
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

  filterForCategorie(idCategorie:any) {
    let index = this.categories_selecteds.findIndex((item:any) => item === Number(idCategorie) );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds.push(idCategorie);
    }
    this.nameCategorie = this.slug;
    this.noneSidebar = false;

    // Nueva línea: actualizar el título
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
    // Limpia todos los colores previamente seleccionados
    this.selectedColors = [];
  
    // Añade el nuevo color
    this.selectedColors.push(colorName);
    
    //this.filtersApplied = true;

    // Filtra productos
    this.filterProduct();
  }
  
  filterProduct() {
    this.products = []; // Limpiamos los productos actuales
    setTimeout(() => {
      let priceRange = $("#amount").val(); // Obtiene el valor del input, ej. "$39 - $83"
      if (!priceRange) {
        console.error("El input #amount no tiene valor definido.");
        return;
      }
      
      let priceArray = priceRange.replace(/\$/g, "").split(" - "); // Remueve todos los '$'

      // Establecemos los valores predeterminados del slider
      let defaultMin = 15;
      let defaultMax = 100;

      // Convertimos los valores del precio
      let priceMin = priceArray[0] ? parseFloat(priceArray[0].trim()) : null;
      let priceMax = priceArray[1] ? parseFloat(priceArray[1].trim()) : null;

      // Actualizar la variable filtersApplied
      // La lógica revisa si los valores de precio son diferentes de los predeterminados
      this.filtersApplied = this.categories_selecteds.length > 0 || this.selectedColors.length > 0 || this.variedad_selected.length > 0 || priceMin !== defaultMin || priceMax !== defaultMax;


      let data = {
        categories_selecteds: this.categories_selecteds,
        is_discount: this.is_discount,
        variedad_selected: this.variedad_selected.id ? this.variedad_selected : null,
        price_min: priceMin,
        price_max: priceMax,
        selectedColors: this.selectedColors, // <-- ¡Aquí añadimos los colores!
      }

      // Actualizar la variable filtersApplied
      //this.filtersApplied = this.selectedColors.length > 0 || this.variedad_selected.length > 0 || priceRange !== "";

      // Llamada al servicio para obtener los productos filtrados
      this._ecommerceGuestService.filterProduct(data).subscribe((resp:any) => {
        this.products = resp.products;
      });
    }, 500);
  }

  // selectedTalla(talla: any) {
  //   let index = this.selectedTallas.indexOf(talla);
  //   if (index === -1) {
  //     this.selectedTallas.push(talla);  // Si la talla no está seleccionada, la agregamos
  //   } else {
  //     this.selectedTallas.splice(index, 1);  // Si la talla ya está seleccionada, la eliminamos
  //   }
  //   this.filterProduct();  // Volvemos a filtrar los productos con las tallas seleccionadas
  // }

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
    //this.filtersApplied = true;
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

    // console.log("product.type_inventario: " + product.type_inventario);

    
    
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

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    cleanupSliders($);
    cleanupHOMEINITTEMPLATE($);
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
  
  // Cada vez que el usuario aplica un filtro:
  applyAnyFilter() {
    // Esto lo llamas cuando el usuario selecciona categoría, variedad, talla, color o mueve el slider
    this.filtersApplied = true;
    this.filterProduct();
  }
  
  // clearFilters() {
  //   this.categories_selecteds = [];
  //   this.is_discount = false;
  //   this.variedad_selected = null;

  //    $("#amount").val(""); // Limpiar el input de precio
  //    $("#slider-range").slider("values", [0, 10]); // Restablecer el slider (ajusta los valores según tu configuración)

  //    let data = {
  //        categories_selecteds: this.categories_selecteds,
  //        is_discount: this.is_discount,
  //        variedad_selected: this.variedad_selected.id ? this.variedad_selected : null,
  //        price_min: null,
  //        price_max: null,
  //    };

  //   this._ecommerceGuestService.filterProduct(data).subscribe((resp: any) => {
  //        this.products = resp.products;
  //   });
  //  }

  // navigateToProduct(slug: string, discountId?: string) {
  //   // Guarda el estado para hacer scroll hacia arriba
  //   sessionStorage.setItem('scrollToTop', 'true');
  //   // Navega a la página del producto
  //   this._router.navigate(['/product', slug], { queryParams: { _id: discountId } })
  //   .then(() => {
  //       // Recarga la página
  //       window.location.reload();
  //   });
  // }

}
