import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, fromEvent } from 'rxjs';
import { CartService } from 'src/app/modules/ecommerce-guest/_service/cart.service';
import { LanguageService } from 'src/app/services/language.service';
declare var $:any;
declare function headerIconToggle([]):any;
declare function sectionCart():any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit {
  
  selectedLanguage: string = 'ES';
  listCarts:any=[];
  totalCarts:any=0;
  user:any;
  //
  search_product:any=null;
  products_search:any=[];

  source:any;
  @ViewChild("filter") filter?:ElementRef;

  constructor(
    public _router: Router,
    public _cartService: CartService,
    public translate: TranslateService,
    private languageService: LanguageService,
  ) {
    translate.setDefaultLang('es');
  }

  changeLanguageToSpanish(language: string): void {
    this.selectedLanguage = language.toUpperCase();
    this.translate.use('es');
     //this.languageService.setLanguage(language);
   }
  
  changeLanguageToEnglish(language: string): void {
    this.selectedLanguage = language.toUpperCase();
    this.translate.use('en');
     //this.languageService.setLanguage(language);
   }

  ngOnInit() {
    this.user = this._cartService._authService.user;
    this._cartService.currenteDataCart$.subscribe((resp:any) => {
      this.listCarts = resp;
      this.totalCarts = this.listCarts.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
    });
    if (this._cartService._authService.user) {
      this._cartService.listCarts(this._cartService._authService.user._id).subscribe((resp:any) => {
        console.log("DEBUGG: Header  listCarts");
        console.log(resp);
        
        resp.carts.forEach((cart:any) => {
          this._cartService.changeCart(cart);
        });
      });
    }

    setTimeout(() => {
      headerIconToggle($);
      sectionCart();
    }, 50);
  }

  ngAfterViewInit(): void {
    this.source = fromEvent(this.filter?.nativeElement, "keyup");
    this.source.pipe(debounceTime(500)).subscribe((c:any) => {
      let data = {
        search_product: this.search_product,
      }
      if(this.search_product.length > 1){
        this._cartService.searchProduct(data).subscribe((resp:any) => {
          console.log(resp);
          
          this.products_search = resp.products;
        })
      }
    })
  }

  dec(cart:any) {
    if (cart.cantidad - 1 == 0) {
      alertDanger("No puedes disminur un producto a 0");
      return;
    }
    cart.cantidad = cart.cantidad - 1;
    // cart.subtotal = cart.price_unitario * cart.cantidad;
    // cart.total = cart.price_unitario * cart.cantidad;
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));

    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad._id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      console.log(resp);
    });
  }

  inc(cart:any) {
    cart.cantidad = cart.cantidad + 1;
    //cart.subtotal = cart.price_unitario * cart.cantidad;
    //cart.total = cart.price_unitario * cart.cantidad;
    // cart.subtotal = Number((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.subtotal = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    cart.total = parseFloat((cart.price_unitario * cart.cantidad).toFixed(2));
    
    // AQUI VA LA FUNCION PARA ENVIARLO AL SERVICE O BACKEND
    let data = {
      _id: cart._id,
      cantidad: cart.cantidad,
      subtotal: cart.subtotal,
      total: cart.total,
      variedad: cart.variedad ? cart.variedad._id : null,
      product: cart.product._id,
    }
    this._cartService.updateCart(data).subscribe((resp:any) => {
      console.log(resp);
    }); 
  }

  isHome() {
    return this._router.url == "" || this._router.url == "/" ? true : false;
  }

  logout() {
    this._cartService._authService.logout();
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
        return (product.price_usd*product.campaing_discount.discount*0.01).toFixed(2);
      } else { // 2 es moneda
        return product.campaing_discount.discount;
      }
    }
    return 0;
  }

  removeCart(cart:any) {
    this._cartService.deleteCart(cart._id).subscribe((resp:any) => {
      console.log(resp);
      this._cartService.removeItemCart(cart);
    });
  }

  searchProduct() {

  }
}
