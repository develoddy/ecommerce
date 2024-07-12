import { Component, OnInit, HostListener } from '@angular/core';
import { EcommerceGuestService } from '../_service/ecommerce-guest.service';
import { CartService } from '../_service/cart.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function alertDanger([]):any;
declare function alertSuccess([]):any;
declare function priceRangeSlider():any;
declare function ModalProductDetail():any;


@Component({
  selector: 'app-filter-products',
  templateUrl: './filter-products.component.html',
  styleUrls: ['./filter-products.component.css']
})
export class FilterProductsComponent implements OnInit {
  euro = "€";
  categories:any=[];
  variedades:any=[];
  categories_selecteds:any = [];
  is_discount:any = 1; // 1 es normal,  y 2 es producto con descuento
  variedad_selected:any = {
    _id: null,
  };
  products:any = [];
  product_selected:any=null;
  slug:any=null;
  isDesktopSize: boolean = window.innerWidth >= 992; // Inicialización
  isMobileSize: boolean = window.innerWidth < 768;
  idCategorie:any=null;
  noneSidebar = true;
  nameCategorie = null;
  
  constructor(
    public _ecommerceGuestService: EcommerceGuestService,
    public _cartService: CartService,
    public _router: Router,
    public _routerActived: ActivatedRoute,
  ) {}
  
  ngOnInit(): void {

    this._routerActived.params.subscribe((resp:any) => {
      this.slug = resp["slug"];
      this.idCategorie = resp["idCategorie"];
    });

    if (this.idCategorie) {
      this.filterForCategorie(this.idCategorie); 
    }

    this._ecommerceGuestService.configInitial().subscribe((resp:any) => {
      this.categories = resp.categories;
      console.log("Debbbug: this.categories >> ", this.categories);
      this.variedades = resp.variedades;

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
      HOMEINITTEMPLATE($);
      //priceRangeSlider();
    }, 50);
    

    this.filterProduct();
  }

  // @HostListener('window:resize', ['$event'])
  // onResize(event: any) {
  //   this.isDesktopSize = event.target.innerWidth >= 992;
  // }

  // isDesktop(): boolean {
  //   return this.isDesktopSize;
  // }

  checkWindowSize() {
    this.isMobileSize = window.innerWidth < 768; // Ajusta el valor del tamaño móvil según sea necesario
  }

  isMobile(): boolean {
    return this.isMobileSize;
  }

  filterForCategorie(idCategorie:any) {
    
    let index = this.categories_selecteds.findIndex((item:any) => item == idCategorie );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds.push(idCategorie);
    }
    this.nameCategorie = this.slug;
    this.noneSidebar = false;
    this.filterProduct();
  }

  addCategorie(categorie:any) {
    let index = this.categories_selecteds.findIndex((item:any) => item == categorie.id );
    if (index != -1) {
      this.categories_selecteds.splice(index, 1);
    } else {
      this.categories_selecteds.push(categorie.id);
    }
    this.filterProduct();
  }

  selectedDiscount(value: number) {
    this.is_discount = value;
    this.filterProduct();
  }

  selectedVariedad(variedad:any) {
    this.variedad_selected = variedad;
    this.filterProduct();
  }

  filterProduct() {
    let data = {
      categories_selecteds: this.categories_selecteds,
      is_discount: this.is_discount,
      variedad_selected: this.variedad_selected.id ? this.variedad_selected : null,
      price_min: $("#amount-min").val(),
      price_max: $("#amount-max").val(),
    }
    this._ecommerceGuestService.filterProduct(data).subscribe((resp:any) => {
      this.products = resp.products;
      console.log("debug: products : ", this.products);
    });
  }

  getRouterDiscount(product:any) {
    if (product.campaing_discount) {
      return {_id: product.campaing_discount._id};
    }
    return {};
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
      user: this._cartService._authService.user._id,
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
}
