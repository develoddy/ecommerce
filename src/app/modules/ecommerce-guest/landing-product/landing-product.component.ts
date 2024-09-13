import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { Subscription } from 'rxjs';
import { MinicartService } from 'src/app/services/minicartService.service';
import { EcommerceAuthService } from '../../ecommerce-auth/_services/ecommerce-auth.service';
import { WishlistService } from '../_service/wishlist.service';

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
export class LandingProductComponent implements OnInit, OnDestroy/*, AfterViewInit*/ {

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

  // REVIEWS
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

  errorResponse:boolean=false;
  errorMessage:any="";

  availableSizes = ['S', 'M', 'L', 'XL'];  // LISTA DE TODAS LAS TALLAS POSIBLES

  CURRENT_USER_AUTHENTICATED:any=null;

  loading: boolean = false;

  private routeParamsSubscription: Subscription | undefined;
  private queryParamsSubscription: Subscription | undefined;
  private productSubscription: Subscription | undefined;

  constructor(
    public _ecommerce_guestService: EcommerceGuestService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public _cartService: CartService,
    public _wishlistService: WishlistService,
    private minicartService: MinicartService,
    public _ecommerceAuthService: EcommerceAuthService,
  ) {}

  ngOnInit(): void {

    this._ecommerce_guestService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser(); // Verifica el usuario autenticado

    this.subscribeToRouteParams(); // Suscripción a los parámetros de la ruta
    this.subscribeToQueryParams(); // Suscripción a los parámetros de consulta

    this.initLandingProduct(); // Inicializa el producto en la landing page
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
    });
  }

  private subscribeToRouteParams(): void {
    this.routeParamsSubscription = this._routerActived.params.subscribe(
      ( resp: any ) => {
        this.slug = resp["slug"];
      });
  }
  
  private subscribeToQueryParams(): void {
    this.queryParamsSubscription = this._routerActived.queryParams.subscribe(
      ( resp: any ) => {
        this.discount_id = resp["_id"];
      });
  }
  
  private initLandingProduct() {
    this.productSubscription  = this._ecommerce_guestService.showLandingProduct(
      this.slug, 
      this.discount_id
    ).subscribe( ( resp:any ) => {
      
      this.product_selected   = resp.product;
      this.related_products   = resp.related_products;
      this.SALE_FLASH         = resp.SALE_FLASH;
      this.REVIEWS            = resp.REVIEWS;
      this.AVG_REVIEW         = resp.AVG_REVIEW;
      this.COUNT_REVIEW       = resp.COUNT_REVIEW;

      // VERIFICA SI EL USUARIO ESTÁ AUTENTICADO ANTES DE LLAMAR AL METODO showProfileClient
      if( this.CURRENT_USER_AUTHENTICATED ) {
        this.showProfileClient();
      }

      // FILTRAR TALLAS DUPLICADAS Y ELIMINAR TALLAS NO DISPONIBLES
      // ORDENAR POR VALOR DE MENOR A MAYOR
      this.variedades = resp.product.variedades.filter(
        ( item: any, 
          index: number, 
          self: any[]
        ) => index === self.findIndex(
          ( t: any ) => t.valor === item.valor && t.stock > 0
        )
      ).sort(
        ( a: any, b: any ) => ( a.valor > b.valor ) ? 1 : -1
      ); 
      
      this.filterUniqueGalerias();
      this.setFirstImage();
      this.setColoresDisponibles();

      // SELECCIONAR AUTOMÁTICAMENTE EL PRIMER COLOR
      this.selectedColor = this.coloresDisponibles[ 0 ]?.color || '';

      // FILTRAR LAS TALLAS DISPONIBLES PARA EL PRIMER COLOR SELECCIONADO
      this.variedades = this.product_selected.variedades
          .filter((variedad: any) => variedad.color === this.selectedColor)
          .sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);

      // MAPEAR LAS VARIEDADES PARA INDICAR DISPONIBILIDAD
      this.variedades = this.availableSizes.map(size => {
          const foundVariedad = this.variedades.find( variedad => variedad.valor === size );
          return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
      });

      this.variedad_selected = this.variedades.find( v => v.stock > 0 ) || null;
      this.activeIndex = 0;

        setTimeout(() => {
          HOMEINITTEMPLATE($);
          pswp($);
          productZoom($);
        }, 50);
    }); 
  }

  private showProfileClient() {
    let data = {
      user_id: this.CURRENT_USER_AUTHENTICATED._id, //this._ecommerceAuthService._authService.user._id,
    };
  
    this._ecommerceAuthService.showProfileClient( data ).subscribe( ( resp: any ) => {
      this.sale_orders = resp.sale_orders;
      this.sale_details = [];
  
      this.sale_orders.forEach((order: any) => {
        if (order && order.sale_details && Array.isArray(order.sale_details)) {
          order.sale_details.forEach((sale_detail: any) => {
            this.sale_details.push(sale_detail);
          });
        }
      });
  
      // ENCONTRAR EL SALE_DETAIL QUE COINCIDE CON EL PRODUCT_SELECTED
      const matchingSaleDetail = this.sale_details.find(
        (sale_detail: any) => sale_detail.product._id === this.product_selected._id
      );
  
      // VERIFICAR SI EXISTE UNA REVIEW PARA EL PRODUCT_SELECTED
      const matchingReview = this.REVIEWS.find(
        (review: any) => review.productId === this.product_selected._id
      );
  
      if ( matchingSaleDetail && matchingReview ) {
        // SI EXISTEN AMBOS, SALE_DETAIL Y REVIEW, MOSTRAR FORMULARIO PARA EDITAR LA REEVIEW
        console.log("Se encontró un sale_detail y una review coincidentes:", matchingSaleDetail, matchingReview);
        this.viewReview(matchingSaleDetail);

      } else if ( matchingSaleDetail && !matchingReview ) {

        // SI EXISTE SALE_DETAIL PERO NO HAY REVIEW, MOSTRAR FORMULARIO PARA AGREGAR UNA NUEVA REVIEW
        console.log("Se encontró un sale_detail pero no hay review. Mostrar formulario para agregar review.", matchingSaleDetail);
        this.viewReview(matchingSaleDetail); // PASAR UN OBJETO VACIO PARA INICIAR UN FORMULARIO EN BLANCO

      } else {

        // SI NO SE ENCUENTRA NINGÚN SALE_DETAIL NI REVIEW, NO MOSTRAR EL FORMULARIO
 
        // MOSTRAR RESEÑAS DE OTROS USUARIOS PARA EL PRODUCTO SELECCIONADO
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
    });
  }

  private viewReview(sale_detail:any) {

    if ( sale_detail ) {
      this.sale_detail_selected = sale_detail;

      if ( this.sale_detail_selected.review ) {

        this.title        = this.sale_detail_selected.review.title;
        this.cantidad     = this.sale_detail_selected.review.cantidad;
        this.description  = this.sale_detail_selected.review.description;

      } else {

        this.title        = null;
        this.cantidad     = null;
        this.description  = null;

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

    // MAPEA LOS NOMBRES DE LOS COLORES A SUS VALORES HEXADECIMALES CORRESPONDIENTES
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
    return {
      'active': imagen === this.firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true
    };
  }

  setActiveIndex(index: number) {
    this.activeIndex = index;
  }  

  openModal(besProduct:any, FlashSale:any=null) {
    this.product_selected_modal = null;
    setTimeout(() => {
      this.product_selected_modal           = besProduct;
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
    //console.log(`Variedad antes de la actualización: ${this.variedad_selected?.valor}`);
    this.variedad_selected = variedad;
    
    this.activeIndex = index;
    //console.log(`Talla seleccionada: ${this.variedad_selected.valor}`);
  }

  // AÑADIR PRODUCTOS A FAVORITOS
  //
  //
  addWishlist(product:any) {
    if( !this.CURRENT_USER_AUTHENTICATED ) {
      this.errorResponse = true;
      this.errorMessage = "Por favor, autentifíquese para poder añadir el producto a favoritos";
      return;
    }

    let data = {
      user          : this.CURRENT_USER_AUTHENTICATED._id                                             ,
      product       : this.product_selected._id                                                       ,
      type_discount : this.SALE_FLASH ? this.SALE_FLASH.type_discount : null                          ,
      discount      : this.SALE_FLASH ? this.SALE_FLASH.discount : 0                                  ,
      cantidad      : $("#qty-cart").val()                                                            ,
      variedad      : this.variedad_selected ? this.variedad_selected.id : null                       ,
      code_cupon    : null                                                                            ,
      code_discount : this.SALE_FLASH ? this.SALE_FLASH._id : null                                    ,
      price_unitario: this.product_selected.price_usd                                                 ,
      subtotal      : this.product_selected.price_usd - this.getDiscount()                            ,  
      total         : (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val()     , 
    }

    this._wishlistService.registerWishlist( data ).subscribe( ( resp:any ) => {
      
      if ( resp.message == 403 ) {
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;
      } else {
        this._wishlistService.changeWishlist(resp.wishlist);
        alertSuccess( resp.message_text );
      }
    }, error => {
      console.log("__ Debbug > Error Register Wishlist 431: ", error.error.message);
      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this._wishlistService._authService.logout();
      }
    });
  }



  // AÑADITOS PRODUCTOS AL CARRITO DE COMPRAS
  //
  //
  addCart(product:any) {

    //if ( !this._cartService._authService.user ) {
    if( !this.CURRENT_USER_AUTHENTICATED ) {
      //alertDanger("Por favor, autentifíquese para poder añadir el producto a la cesta.");
      this.errorResponse = true;
      this.errorMessage = "Por favor, autentifíquese para poder añadir el producto al carrito de compras";
      return;
    }
    if ( $("#qty-cart").val() == 0 ) {
      //alertDanger("Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta.");
      this.errorResponse = true;
      this.errorMessage = "Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta";
      return;
    }
  
    if ( this.product_selected.type_inventario == 2 ) {

      if ( !this.variedad_selected ) {
        //alertDanger("Por favor, seleccione una variedad antes de añadir a la cesta.");
        //alertDanger("No hay stock disponible para este color.");
        this.errorResponse = true;
        this.errorMessage = "No hay stock disponible para este color";
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          //alertDanger("Por favor, reduzca la cantidad. Stock insuficiente.");
          this.errorResponse = true;
          this.errorMessage = "Por favor, reduzca la cantidad. Stock insuficiente";
          return;
        }
      }
    }

    let data = {
      user: this.CURRENT_USER_AUTHENTICATED._id,//this._cartService._authService.user._id,
      product: this.product_selected._id,
      type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
      discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
      cantidad: $("#qty-cart").val(),
      variedad: this.variedad_selected ? this.variedad_selected.id : null,
      code_cupon: null,
      code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
      price_unitario: this.product_selected.price_usd,
      subtotal: this.product_selected.price_usd - this.getDiscount(),  //*$("#qty-cart").val(),
      total: (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val(), // De momento es igual, luego aplicamos el descuento
    }

    this._cartService.registerCart(data).subscribe((resp:any) => {
      if (resp.message == 403) {
        //alertDanger(resp.message_text);
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;
      } else {
        this._cartService.changeCart(resp.cart);
        //alertSuccess("El producto ha sido añadido correctamente a la cesta.");
        this.minicartService.openMinicart();
      }
    }, error => {

      if (error.error.message == "EL TOKEN NO ES VALIDO") {
        this._cartService._authService.logout();
      }
    });
  }

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

    // Destruir elevateZoom
    // Verificar si el zoom está inicializado antes de intentar destruirlo
    // const elevateZoomInstance = $('.zoompro').data('elevateZoom');
    // if (elevateZoomInstance && typeof elevateZoomInstance.destroy === 'function') {
    //   elevateZoomInstance.destroy();  // Destruye el zoom cuando cambias de componente
    // } else {
    //   console.warn('elevateZoomInstance no tiene el método destroy o no está inicializado');
    // }

    const elevateZoomInstance = $('.zoompro').data('elevateZoom');
    if (elevateZoomInstance) {
      // Eliminar manualmente los atributos del zoom
      $('.zoomContainer').remove(); // Eliminar el contenedor del zoom
      $('.zoompro').off('.elevateZoom'); // Eliminar eventos asociados al zoom
      $('.zoompro').removeData('elevateZoom'); // Limpiar los datos del zoom
    }
  }

  addCantidad(cantidad:number) {
    this.cantidad = cantidad; 
  }

  save() {
    if (this.sale_detail_selected.review) {
      this.updateReview();
    } else {
      this.saveReview();
    }
  }

  saveReview() {
    if ( !this.title || !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }
    
    let data = {
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.CURRENT_USER_AUTHENTICATED._id,//this._ecommerceAuthService._authService.user._id,
      cantidad: this.cantidad,
      title: this.title,
      description: this.description,
    };

    this._ecommerceAuthService.registerProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });
  }

  updateReview() {
    if ( !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }

    let data = {
      _id: this.sale_detail_selected.review.id,
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this.CURRENT_USER_AUTHENTICATED._id,//this._ecommerceAuthService._authService.user._id,
      cantidad: this.cantidad,
      title: this.title,
      description: this.description,
    };

    this._ecommerceAuthService.updateProfileClientReview(data).subscribe((resp:any) => {
      this.sale_detail_selected.review = resp.review;
      this.REVIEWS = [resp.review];
      alertSuccess(resp.message);
    });
  }

  // getDiscountProduct(besProduct:any, is_sale_flash:any=null) {
  //   if (is_sale_flash) {
  //     if (this.SALE_FLASH.type_discount == 1) { // 1 porcentaje
  //       return (besProduct.price_usd*this.SALE_FLASH.discount*0.01).toFixed(2);
  //     } else { // 2 es moneda
  //       return this.SALE_FLASH.discount;
  //     }
  //   } else {
  //     if (besProduct.campaing_discount) {
  //       if (besProduct.campaing_discount.type_discount == 1) { // 1 porcentaje
  //         //return besProduct.price_usd*besProduct.campaing_discount.discount*0.01;
  //         return (besProduct.price_usd*besProduct.campaing_discount.discount*0.01).toFixed(2);
  //       } else { // 2 es moneda
  //         return besProduct.campaing_discount.discount;
  //       }
  //     }
  //   }
  //   return 0;
  // }
}
