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
  
  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService
  ) { 
    translate.setDefaultLang('es');
  }

  ngOnInit(): void {
    if (this._authService.user) {
      this._router.navigate(['/']);
    }
  }

  // Se cambia el idioma a Español
  changeLanguageToSpanish(): void {
    this.translate.use('es');
    console.log('Idioma cambiado al Español');
  }
  // Se cambia el idioma a Inglés
  changeLanguageToEnglish(): void {
    this.translate.use('en');
    console.log('Idioma cambiado al Inglés');
  }

  login() {
    if (!this.email) {
      alertDanger("Es necesario ingresar el email");
    }

    if (!this.password) {
      alertDanger("Es necesario ingresar el password");
    }

    this._authService.login(this.email, this.password).subscribe((resp:any) => {
      // SI NO TIENE UN ERROR Y LA RESPUESTA ES VERDADERA
      // SIGNIFICA QUE EL USUARIO SE LOGUEO CORRECTAMENTE
       if (!resp.error && resp) {
        //this._router.navigate(["/"]); 
        location.reload();
      } else {
        alertDanger(resp.error.message)
      }
    });
  }
}
