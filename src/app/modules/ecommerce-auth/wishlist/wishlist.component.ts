import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MinicartService } from 'src/app/services/minicartService.service';
import { WishlistService } from '../../ecommerce-guest/_service/wishlist.service';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { LoaderService } from 'src/app/services/loader.service';

declare var $:any;
declare function pswp([]):any;
declare function productZoom([]):any;
declare function HOMEINITTEMPLATE([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;
declare var bootstrap: any;  // Declarar Bootstrap para usar sus métodos

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit, OnDestroy {

  euro = "€";
  listWishlists: any[] = [];
  totalWishlists:any=0;
  userId: any;

  CURRENT_USER_AUTHENTICATED:any=null;
  loading: boolean = false;
  private subscriptions: Subscription = new Subscription();

  REVIEWS:any=null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  exist_review:any=null;

  product_selected:any=null;
  filteredGallery: any[] = [];
  variedades: any[] = [];
  variedad_selected:any=null;
  activeIndex: number = 0;
  coloresDisponibles: { color: string, imagen: string }[] = [];
  selectedColor: string = '';
  firstImage: string = '';
  availableSizes = ['S', 'M', 'L', 'XL'];

  errorResponse:boolean=false;
  errorMessage:any="";
  validad_error = false;
  message_error = "";

  locale: string = "";
  country: string = "";

  SALE_FLASH:any = null;

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    public _router: Router,
    public _wishlistService: WishlistService,
    public _cartService: CartService,
    private minicartService: MinicartService,
    private activatedRoute: ActivatedRoute, 
    private localizationService: LocalizationService,
    public loader: LoaderService
  ) {
    // this.activatedRoute.paramMap.subscribe(params => {
    //   this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
    //   this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    // });
    
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {

    this.verifyAuthenticatedUser()

    this.subscriptions.add(
      this.loader.loading$.subscribe(isLoading => {
        this.loading = isLoading;
        if (!isLoading) {
          setTimeout(() => {
            // Inicializa templates y plugins al terminar carga
            HOMEINITTEMPLATE($);
            pswp($);
            productZoom($);
          }, 150);
        }
      })
    );

    this.listAllCarts();
    this._wishlistService.currenteDataWishlist$.subscribe((resp:any) => {
      this.listWishlists      = resp;
      this.REVIEWS            = resp.REVIEWS;
      this.AVG_REVIEW         = resp.AVG_REVIEW;
      this.COUNT_REVIEW       = resp.COUNT_REVIEW;
      this.SALE_FLASH         = resp.SALE_FLASH;
      this.totalWishlists = this.listWishlists.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalWishlists = parseFloat(this.totalWishlists.toFixed(2));
    });
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

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this._router.navigate(['/',this.country, this.locale, 'auth', 'login']);
      }
    });
  }

  listAllCarts() {
    this._wishlistService.resetWishlist();   
    this._wishlistService._authService.user.subscribe(user => {
      if (user) {
        let TIME_NOW = new Date().getTime();
        this.userId = user._id;
        this._wishlistService.listWishlists(this.userId, TIME_NOW).subscribe((resp: any) => {
          resp.wishlists.forEach((wishlistItem:any) => {
            this._wishlistService.changeWishlist(wishlistItem);
          });
        }, error => {
          console.error("Error en la petición de wishlist:", error);
        });
      } 
    });
  }

  addCart(product:any) {
    this._wishlistService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      }
    });

    if ( !this.CURRENT_USER_AUTHENTICATED ) {
      alertDanger("Por favor, autentifíquese para poder añadir el producto a la cesta.");
      this.errorResponse = true;
      this.errorMessage = "Por favor, autentifíquese para poder añadir el producto al carrito de compras";
      return;
    }
    if ( $("#qty-cart").val() == 0 ) {
      //alertDanger("Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta.");
      this.validad_error = true;
      this.message_error = "Por favor, ingrese una cantidad mayor a 0 para añadir a la cesta";
      return;
    }
  
    // if ( this.product_selected.type_inventario == 2 ) {

    //   if ( !this.variedad_selected ) {
    //     //alertDanger("Por favor, seleccione una variedad antes de añadir a la cesta.");
    //     //alertDanger("No hay stock disponible para este color.");
    //     this.errorResponse = true;
    //     this.errorMessage = "No hay stock disponible para este color";
    //     return;
    //   }
    //   if (this.variedad_selected) {
    //     if (this.variedad_selected.stock < $("#qty-cart").val()) {
    //       //alertDanger("Por favor, reduzca la cantidad. Stock insuficiente.");
    //       this.errorResponse = true;
    //       this.errorMessage = "Por favor, reduzca la cantidad. Stock insuficiente";
    //       return;
    //     }
    //   }
    // }


    let data = {
       user: this.CURRENT_USER_AUTHENTICATED._id,
       product: product._id,
       type_discount: null,//this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
       discount: 0, //this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
       cantidad: $("#qty-cart").val(),
       variedad: this.variedad_selected ? this.variedad_selected.id : null,
       code_cupon: null,
       code_discount: 0,//this.SALE_FLASH ? this.SALE_FLASH._id : null,
       price_unitario: product.price_usd,
       subtotal: product.price_usd - 0,//this.getDiscount(),
       total: (product.price_usd - /*this.getDiscount()*/0 )*$("#qty-cart").val(), // De momento es igual, luego aplicamos el descuento
    }

    this._cartService.registerCart(data).subscribe((resp:any) => {

      if ( resp.message == 403 ) {

        alertDanger(resp.message_text);
        this.errorResponse = true;
        this.errorMessage = resp.message_text;
        return;

      } else {

        this._cartService.changeCart(resp.cart);
        alertSuccess("El producto ha sido añadido correctamente a la cesta.");
        this.minicartService.openMinicart();

        // Cerrar el modal después de añadir el producto
        let addtocartModal = document.getElementById('addtocart_modal');
        let modalInstance = bootstrap.Modal.getInstance(addtocartModal); // Obtener instancia del modal
        modalInstance.hide();  // Cerrar el modal
      }
    }, error => {
      if ( error.error.message == "EL TOKEN NO ES VALIDO" ) {
        this._cartService._authService.logout();
      }
    });
  }

  showModalSelectedProduct(wishlist:any) {
    this.product_selected = wishlist.product;
    setTimeout(() => {
      this.filterUniqueGalerias( this.product_selected );
      // Filtrar tallas duplicadas y eliminar tallas no disponibles
      this.variedades = this.product_selected.variedades.filter((item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)).sort((a: any, b: any) => (a.valor > b.valor) ? 1 : -1);
      this.variedad_selected = this.variedades[0] || null;
      this.activeIndex = 0;
      this.setColoresDisponibles();
      this.selectedColor = this.coloresDisponibles[0]?.color || '';

      setTimeout(() => {
        HOMEINITTEMPLATE($);
        pswp($);
        productZoom($);
      }, 50);
    }, 150);
  }

  filterUniqueGalerias(product_selected:any) {
    const uniqueImages = new Set();
    this.filteredGallery = product_selected.galerias.filter((galeria:any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
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
  }

  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    this.activeIndex = index;
  }

  // Obtener los IDs de productos del LocalStorage
  getProductIdsFromLocalStorage() {
    let wishlists = JSON.parse(localStorage.getItem('wishlist') || '[]');
    return wishlists.map((item: any) => item.product);
  }

  removeWishlist(wishlist:any) {    
    this._wishlistService.deleteWishlist(wishlist._id).subscribe((resp:any) => {
      this._wishlistService.removeItemWishlist(wishlist);
    });
  }

  ngOnDestroy(): void {
    // Desuscribir todas las subscripciones
    this.subscriptions.unsubscribe();
  }

}
