import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CartService } from '../../ecommerce-guest/_service/cart.service';

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

  locale: string = "";
  country: string = "";  
  
  constructor(
    public _authService: AuthService,
    public cartService: CartService,
    public _router: Router,
    public translate: TranslateService,
    public routerActived: ActivatedRoute,
  ) {
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado
      this.country = params.get('country') || 'es'; // Valor predeterminado
    });
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
        this._router.navigate(['/']);
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

  public login() {
    if (!this.email) {
      alertDanger("Es necesario ingresar el email");
    }
    if (!this.password) {
      alertDanger("Es necesario ingresar el password");
    }
    this._authService.login(this.email, this.password).subscribe((resp:any) => {
      if ( !resp.error && resp ) {
        this._router.navigate(["/"]);
        this.cartService.resetCart(); 
      } else {
        this.errorAutenticate = true;
        this.errorMessageAutenticate = resp.error.message;
      }
    });
  }

  changeLanguageToSpanish(): void {
    this.translate.use('es');
  }
  
  changeLanguageToEnglish(): void {
    this.translate.use('en');
  }
}
