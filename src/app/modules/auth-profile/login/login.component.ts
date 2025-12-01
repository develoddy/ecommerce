import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CartService } from '../../ecommerce-guest/_service/cart.service';
import { LocalizationService } from 'src/app/services/localization.service';
import { Subscription } from 'rxjs';

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  email:string = "";
  password:string = "";

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  isPasswordVisible: boolean = false;

  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  CURRENT_USER_AUTHENTICATED:any=null;

  public loading: boolean = false;

  private subscriptions: Subscription = new Subscription();

  locale: string = "";
  country: string = "";  
  
  constructor(
    public _authService: AuthService,
    public cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    public routerActived: ActivatedRoute,
    private localizationService: LocalizationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    this._authService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.verifyAuthenticatedUser(); // VERIFICA EL USUARIO AUTENTICADO
    this.checkDeviceType();
  }

  private verifyAuthenticatedUser(): void {
    this._authService.user.subscribe( user => {
      if ( user ) {
        //this._router.navigate(['/']);
        this._router.navigate(['/', this.country, this.locale, 'home']);
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
    });
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  /**
   * Migra el carrito del guest al usuario autenticado
   */
  private migrateGuestCart(user: any): void {
    const user_guest = "Guest";
    
    // 1. Obtener carritos del guest (cache) y del usuario (database)
    this.cartService.listCartsCache(user_guest).subscribe({
      next: (respCache: any) => {
        console.log(`📦 Carrito guest encontrado: ${respCache.carts.length} productos`);
        
        if (respCache.carts.length === 0) {
          // No hay productos en guest, solo limpiar y navegar
          console.log('ℹ️ Guest sin productos, limpiando guest y continuando...');
          this._authService.removeUserGuestLocalStorage();
          this._authService.deleteGuestAndAddresses().subscribe();
          this.cartService.resetCart();
          this._router.navigate(['/', this.country, this.locale, 'home']);
          return;
        }

        // 2. Obtener carrito del usuario autenticado
        this.cartService.listCarts(user._id).subscribe({
          next: (respDatabase: any) => {
            console.log(`🛒 Carrito usuario encontrado: ${respDatabase.carts.length} productos`);
            
            // 3. Merge de ambos carritos (eliminar duplicados)
            const mergedCarts = this.mergeAndRemoveDuplicates(
              respDatabase.carts || [], 
              respCache.carts || []
            );
            
            console.log(`✅ Carritos fusionados: ${mergedCarts.length} productos totales`);
            
            // 4. Sincronizar con backend
            this.cartService.syncCartWithBackend(mergedCarts, user._id).subscribe({
              next: (syncResp: any) => {
                console.log('✅ Carrito migrado exitosamente:', syncResp);
                
                // 5. Actualizar el BehaviorSubject del carrito
                this.cartService.resetCart();
                syncResp.carts?.forEach((cart: any) => {
                  this.cartService.changeCart(cart);
                });
                
                // 6. Limpiar datos del guest DESPUÉS de la migración exitosa
                this._authService.removeUserGuestLocalStorage();
                this._authService.deleteGuestAndAddresses().subscribe({
                  next: () => console.log('🧹 Guest limpiado después de migración'),
                  error: (err) => console.warn('⚠️ Error al limpiar guest:', err)
                });
                
                // 7. Navegar al home
                this._router.navigate(['/', this.country, this.locale, 'home']);
              },
              error: (syncError) => {
                console.error('❌ Error al sincronizar carrito:', syncError);
                // Aún así limpiar guest y navegar
                this._authService.removeUserGuestLocalStorage();
                this.cartService.resetCart();
                this._router.navigate(['/', this.country, this.locale, 'home']);
              }
            });
          },
          error: (dbError) => {
            console.error('❌ Error al obtener carrito del usuario:', dbError);
            this._authService.removeUserGuestLocalStorage();
            this.cartService.resetCart();
            this._router.navigate(['/', this.country, this.locale, 'home']);
          }
        });
      },
      error: (cacheError) => {
        console.error('❌ Error al obtener carrito guest:', cacheError);
        this._authService.removeUserGuestLocalStorage();
        this.cartService.resetCart();
        this._router.navigate(['/', this.country, this.locale, 'home']);
      }
    });
  }

  /**
   * Fusiona carritos eliminando duplicados
   */
  private mergeAndRemoveDuplicates(databaseCarts: any[], cacheCarts: any[]): any[] {
    const combinedCarts = [...databaseCarts, ...cacheCarts];
    const uniqueCarts = new Map();

    combinedCarts.forEach(cart => {
      const productId = cart.product?._id || cart.productId;
      const variedadId = cart.variedad?.id || cart.variedadId;
      const key = `${productId}-${variedadId || 'null'}`;
      
      if (!uniqueCarts.has(key)) {
        uniqueCarts.set(key, cart);
      } else {
        // Si existe, sumar cantidades
        const existing = uniqueCarts.get(key);
        existing.cantidad = (existing.cantidad || 1) + (cart.cantidad || 1);
        existing.subtotal = existing.price_unitario * existing.cantidad;
        existing.total = existing.subtotal;
      }
    });

    return Array.from(uniqueCarts.values());
  }

  public login() {
    if (!this.email) {
      alertDanger("Es necesario ingresar el email");
    }

    if (!this.password) {
      alertDanger("Es necesario ingresar el password");
    }

    const subscriptionLogin = this._authService.login(this.email, this.password).subscribe((
      resp:any) => {
        if ( !resp.error && resp && resp.USER_FRONTED ) {
          // ✅ MIGRACIÓN DE CARRITO GUEST → USUARIO AUTENTICADO
          const guestData = localStorage.getItem('user_guest');
          if (guestData) {
            console.log('🔄 Detectado guest con carrito, iniciando migración...');
            this.migrateGuestCart(resp.USER_FRONTED.user);
          } else {
            // No hay guest, limpiar cualquier dato residual y navegar
            console.log('ℹ️ Login sin guest, navegando...');
            this._authService.removeUserGuestLocalStorage();
            this._router.navigate(['/', this.country, this.locale, 'home']);
          }
        } else {
          this.errorAutenticate = true;
          this.errorMessageAutenticate = resp.error?.message || 'Error de autenticación';
        }
      });
    this.subscriptions.add(subscriptionLogin);
  }

  changeLanguageToSpanish(): void {
    this.translate.use('es');
  }
  
  changeLanguageToEnglish(): void {
    this.translate.use('en');
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
