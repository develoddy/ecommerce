import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

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

  errorAutenticate:boolean=false;
  errorMessageAutenticate:string="";
  CURRENT_USER_AUTHENTICATED:any=null;
  
  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.verifyAuthenticatedUser(); // VERIFICA EL USUARIO AUTENTICADO
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

  public login() {
    if ( !this.email ) {
      alertDanger("Es necesario ingresar el email");
    }

    if ( !this.password ) {
      alertDanger("Es necesario ingresar el password");
    }

    this._authService.login(this.email, this.password).subscribe((resp:any) => {
      // SI NO TIENE UN ERROR Y LA RESPUESTA ES VERDADERA SIGNIFICA QUE EL USUARIO SE LOGUEO CORRECTAMENTE
       if ( !resp.error && resp ) {
        this._router.navigate(["/"]); 
      } else {
        //alertDanger(resp.error.message);
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
