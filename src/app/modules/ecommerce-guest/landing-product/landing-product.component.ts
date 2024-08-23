import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../_service/cart.service';
import { Subscription } from 'rxjs';
import { MinicartService } from 'src/app/services/minicartService.service';
import { EcommerceAuthService } from '../../ecommerce-auth/_services/ecommerce-auth.service';

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

  // Review
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

  availableSizes = ['S', 'M', 'L', 'XL'];  // Lista de todas las tallas posibles

  private routeParamsSubscription: Subscription | undefined;
  private queryParamsSubscription: Subscription | undefined;
  private productSubscription: Subscription | undefined;

  constructor(
    public _ecommerce_guestService: EcommerceGuestService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
    public _cartService: CartService,
    private minicartService: MinicartService,
    public _ecommerceAuthService: EcommerceAuthService,
  ) {}

  ngOnInit(): void {
    this.routeParamsSubscription = this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
    });

    this.queryParamsSubscription = this._routerActived.queryParams.subscribe((resp:any) => {
      this.discount_id = resp["_id"];
    });

    this.initLandingProduct();
  }

  initLandingProduct() {
    this.productSubscription = this._ecommerce_guestService.showLandingProduct(this.slug, this.discount_id).subscribe((resp:any) => {
      this.product_selected = resp.product;
      this.related_products = resp.related_products;
      this.SALE_FLASH = resp.SALE_FLASH;
      this.REVIEWS = resp.REVIEWS;
      this.AVG_REVIEW = resp.AVG_REVIEW;
      this.COUNT_REVIEW = resp.COUNT_REVIEW;

      /// Verifica si el usuario está autenticado antes de llamar a showProfileClient
      if (this._ecommerceAuthService._authService.user) {
        this.showProfileClient();
      }

      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = resp.product.variedades.filter((item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)).sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1); // Ordenar por valor de menor a mayor
      
      this.filterUniqueGalerias();
      this.setFirstImage();
      this.setColoresDisponibles();

      // Seleccionar automáticamente el primer color
      this.selectedColor = this.coloresDisponibles[0]?.color || '';

      // Filtrar las tallas disponibles para el primer color seleccionado
      this.variedades = this.product_selected.variedades
          .filter((variedad: any) => variedad.color === this.selectedColor)
          .sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);

      // Mapear las variedades para indicar disponibilidad
      this.variedades = this.availableSizes.map(size => {
          const foundVariedad = this.variedades.find(variedad => variedad.valor === size);
          return foundVariedad ? foundVariedad : { valor: size, stock: 0 };
      });

      this.variedad_selected = this.variedades.find(v => v.stock > 0) || null;
      this.activeIndex = 0;

        setTimeout(() => {
          HOMEINITTEMPLATE($);
          pswp($);
          productZoom($);
        }, 50);
    }); 
  }

  showProfileClient() {
    let data = {
      user_id: this._ecommerceAuthService._authService.user._id,
    };
  
    this._ecommerceAuthService.showProfileClient(data).subscribe((resp: any) => {
      this.sale_orders = resp.sale_orders;
      this.sale_details = [];
  
      this.sale_orders.forEach((order: any) => {
        if (order && order.sale_details && Array.isArray(order.sale_details)) {
          order.sale_details.forEach((sale_detail: any) => {
            this.sale_details.push(sale_detail);
          });
        }
      });
  
      // Encontrar el sale_detail que coincide con el product_selected
      const matchingSaleDetail = this.sale_details.find(
        (sale_detail: any) => sale_detail.product._id === this.product_selected._id
      );
  
      // Verificar si existe una review para el product_selected
      const matchingReview = this.REVIEWS.find(
        (review: any) => review.productId === this.product_selected._id
      );
  
      if (matchingSaleDetail && matchingReview) {
        // Si existen ambos, sale_detail y review, mostrar formulario para editar la review
        console.log("Se encontró un sale_detail y una review coincidentes:", matchingSaleDetail, matchingReview);
        this.viewReview(matchingSaleDetail);
      } else if (matchingSaleDetail && !matchingReview) {
        // Si existe sale_detail pero no hay review, mostrar formulario para agregar una nueva review
        console.log("Se encontró un sale_detail pero no hay review. Mostrar formulario para agregar review.", matchingSaleDetail);
        this.viewReview(matchingSaleDetail); // Pasar un objeto vacío para iniciar un formulario en blanco
      } else {
        // Si no se encuentra ningún sale_detail ni review, no mostrar el formulario
        console.log("No se encontró ningún sale_detail ni review.");
        //this.viewReview(null); // O cualquier otro comportamiento que desees

        // Mostrar reseñas de otros usuarios para el producto seleccionado
        const otherReviews = this.REVIEWS.filter(
          (review: any) => review.productId === this.product_selected._id
        );

        if (otherReviews.length > 0) {
          console.log("Mostrando reseñas de otros usuarios:", otherReviews);
          // Aquí podrías mostrar estas reseñas en el UI
          // Por ejemplo, podrías asignarlas a una variable en el componente para renderizar en el template
          //this.displayOtherReviews(otherReviews);
        } else {
          console.log("No hay reseñas disponibles para este producto.");
          this.viewReview(null); // O cualquier otro comportamiento que desees
        }
      }
    });
  }

  viewReview(sale_detail:any) {
    if (sale_detail) {
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

  private reloadPage(): void {
    const reloaded = sessionStorage.getItem('reloaded');
    if (!reloaded) {
      sessionStorage.setItem('reloaded', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('reloaded');
    }
  }
  
  filterUniqueGalerias() {
    const uniqueImages = new Set();
    this.uniqueGalerias = this.product_selected.galerias.filter((galeria:any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
  }

  setFirstImage() {
    if (this.uniqueGalerias.length > 0) {
      this.firstImage = this.uniqueGalerias[0].imagen;
    }
  }

  setColoresDisponibles() {
    const uniqueColors = new Map();
    this.product_selected.galerias.forEach((galeria: any) => {
      if (!uniqueColors.has(galeria.color)) {
        uniqueColors.set(galeria.color, { imagen: galeria.imagen, hex: this.getColorHex(galeria.color) });
      }
    });
    this.coloresDisponibles = Array.from(uniqueColors, ([color, { imagen, hex }]) => ({ color, imagen, hex }));
  }

  updateZoomImage(newImage: string) {
    this.firstImage = newImage;
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
      this.product_selected_modal = besProduct;
      this.product_selected_modal.FlashSale = FlashSale;
      setTimeout(() => {
        ModalProductDetail();
      }, 50);
    }, 150);
  }

  getDiscount() {
    let discount = 0;
    if (this.SALE_FLASH) {
      if (this.SALE_FLASH.type_discount == 1) {
        return (this.SALE_FLASH.discount*this.product_selected.price_usd*0.01).toFixed(2);
      } else {
        return this.SALE_FLASH.discount;
      }
    }
    return discount;
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
    console.log(`Color seleccionado: ${this.selectedColor}`);

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

  addCart(product:any) {

    if ( !this._cartService._authService.user ) {
      alertDanger("Por favor, autentifíquese para poder añadir el producto a la cesta.");
      return;
    }
    if ( $("#qty-cart").val() == 0 ) {
      alertDanger("Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta.");
      return;
    }
  
    if ( this.product_selected.type_inventario == 2 ) {

      if ( !this.variedad_selected ) {
        //alertDanger("Por favor, seleccione una variedad antes de añadir a la cesta.");
        alertDanger("No hay stock disponible para este color.");
        return;
      }
      if (this.variedad_selected) {
        if (this.variedad_selected.stock < $("#qty-cart").val()) {
          alertDanger("Por favor, reduzca la cantidad. Stock insuficiente.");
          return;
        }
      }
    }

    let data = {
      user: this._cartService._authService.user._id,
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
        alertDanger(resp.message_text);
        return;
      } else {
        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto ha sido añadido correctamente a la cesta.");
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
    console.log('____Debbug: El componente del Landing de producto ha sido destruido..');
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

  // REGISTER review
  saveReview() {
    if ( !this.title || !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }
    
    let data = {
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this._ecommerceAuthService._authService.user._id,
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

  // UPDATE review
  updateReview() {
    if ( !this.cantidad || !this.description) {
      alertDanger("Todos los campos del formularios son importantes!");
      return;
    }

    let data = {
      _id: this.sale_detail_selected.review.id,
      product: this.sale_detail_selected.product._id,
      sale_detail: this.sale_detail_selected._id,
      user: this._ecommerceAuthService._authService.user._id,
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
}
