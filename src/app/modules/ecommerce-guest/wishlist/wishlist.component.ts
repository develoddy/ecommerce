import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WishlistService } from '../_service/wishlist.service';

declare var $:any;
declare function pswp([]):any;
declare function productZoom([]):any;
declare function HOMEINITTEMPLATE([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {

  euro = "€";
  listWishlists: any[] = [];
  totalWishlists:any=0;
  userId: any;

  CURRENT_USER_AUTHENTICATED:any=null;
  loading: boolean = false;

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

  constructor(
    public _router: Router,
    public _wishlistService: WishlistService,
  ) {}

  ngOnInit(): void {
    
    this._wishlistService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.listAllCarts();

    this._wishlistService.currenteDataWishlist$.subscribe((resp:any) => {
      
      this.listWishlists      = resp;
      this.REVIEWS            = resp.REVIEWS;
      this.AVG_REVIEW         = resp.AVG_REVIEW;
      this.COUNT_REVIEW       = resp.COUNT_REVIEW;


      this.totalWishlists = this.listWishlists.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalWishlists = parseFloat(this.totalWishlists.toFixed(2));
    });

    // setTimeout(() => {
    //    HOMEINITTEMPLATE($);
    // }, 50);
  }

  listAllCarts() {
    this._wishlistService.resetWishlist();

    let productIds = this.getProductIdsFromLocalStorage(); // Obtener IDs del LocalStorage
    //console.log("DEBBUG: getProductIdsFromLocalStorage", productIds);

    this._wishlistService._authService.user.subscribe(user => {
      if (user) {
        this.userId = user._id;
        this._wishlistService.listWishlists(this.userId).subscribe((resp: any) => {

          if (Array.isArray(resp.wishlists)) {
            resp.wishlists.forEach((wishlistItem: any) => {
              // Procesar wishlist autenticado
              console.log("Debbug > Productos de BBDD con usuario SI autenticado : ", wishlistItem);
              this._wishlistService.changeWishlist(wishlistItem);
            });
          } else {
            console.error("Error: 'wishlists' no es un array o está indefinido", resp);
          }
        }, error => {
          console.error("Error en la petición de wishlist:", error);
        });
      } else if (productIds.length > 0) {
        this._wishlistService.listWishlists(null, productIds).subscribe((resp: any) => {
          if (Array.isArray(resp.products)) {
            resp.products.forEach((wishlistItem: any) => {
              // Procesar wishlist desde localStorage
              console.log("Debbug > Productos de localstorage con usuario NO autenticado : ", wishlistItem);
              this._wishlistService.changeWishlist(wishlistItem);
            });
          } else {
            console.error("Error: 'products' no es un array o está indefinido", resp);
          }
        }, error => {
          console.error("Error en la petición de wishlist:", error);
        });
      }
    });
  }


  validad_error = false;
  message_error = "";

  addCart(product:any) {

    if (!this._wishlistService._authService.user) {
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

    console.log("this.CURRENT_USER_AUTHENTICATED._id: ", this.CURRENT_USER_AUTHENTICATED._id);
    console.log("Selected variedad o talla: ", this.variedad_selected ? this.variedad_selected.id : null);
    console.log("Cantidad: ", $("#qty-cart").val());
    //console.log("type_discount: ", this.SALE_FLASH ? this.SALE_FLASH.discount : 0);
    
    

    // let data = {
    //   user: this.CURRENT_USER_AUTHENTICATED._id,
    //   product: this.product_selected._id,
    //   type_discount: this.SALE_FLASH ? this.SALE_FLASH.type_discount : null,
    //   discount: this.SALE_FLASH ? this.SALE_FLASH.discount : 0,
    //   cantidad: $("#qty-cart").val(),
    //   variedad: this.variedad_selected ? this.variedad_selected.id : null,
    //   code_cupon: null,
    //   code_discount: this.SALE_FLASH ? this.SALE_FLASH._id : null,
    //   price_unitario: this.product_selected.price_usd,
    //   subtotal: this.product_selected.price_usd - this.getDiscount(),  //*$("#qty-cart").val(),
    //   total: (this.product_selected.price_usd - this.getDiscount())*$("#qty-cart").val(), // De momento es igual, luego aplicamos el descuento
    // }

    // this._cartService.registerCart(data).subscribe((resp:any) => {
    //   if (resp.message == 403) {
    //     //alertDanger(resp.message_text);
    //     this.errorResponse = true;
    //     this.errorMessage = resp.message_text;
    //     return;
    //   } else {
    //     this._cartService.changeCart(resp.cart);
    //     //alertSuccess("El producto ha sido añadido correctamente a la cesta.");
    //     this.minicartService.openMinicart();
    //   }
    // }, error => {

    //   if (error.error.message == "EL TOKEN NO ES VALIDO") {
    //     this._cartService._authService.logout();
    //   }
    // });
  }





  errorResponse:boolean=false;
  errorMessage:any="";
  showModalSelectedProduct(product:any) {
    console.log("Agregar al carrito: ", product);
    this.product_selected = product;

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

    console.log("Debbug  filteredGallery : ", this.filteredGallery);
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
  }

  selectedVariedad(variedad:any, index: number) {
    this.variedad_selected = variedad;
    console.log("this.variedad_selected: ", this.variedad_selected);
    
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

}
