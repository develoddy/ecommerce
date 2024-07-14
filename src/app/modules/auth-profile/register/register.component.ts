import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  email:string = "";
  name:string = "";
  surname:string = "";
  password:string = "";
  repeat_password:string = "";
  success:boolean=false;

  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService
  ){
    translate.setDefaultLang('es');
  }

  ngOnInit(): void {
    if (this._authService.user) {
      this._router.navigate(['/']);
    }
  }

  getTranslatedCondition(): string {
    return this.translate.instant('auth_profile.register.condition');
  }

  register() {
    if(
      !this.email ||
      !this.name ||
      !this.surname ||
      !this.password ||
      !this.repeat_password) {
        alertDanger("Todos los campos son requeridos.");
        return;
    }

    if(this.password != this.repeat_password) {
      alertDanger("Ambas contraseñas deben ser iguales.");
      return;
    }

    let data = {
      email: this.email, 
      name: this.name ,
      surname: this.surname,
      password: this.password,
      repeat_password: this.repeat_password,
      rol: "cliente"
    };

    this._authService.register(data).subscribe(
      (resp:any) => {
        if ( resp.status === 200 ) {
          //alertSuccess("Tus datos se han registrado correctamente.");
          this.email = '';
          this.name = '';
          this.surname = '';
          this.password = '';
          this.repeat_password = '';
          this.success = true;
        } else {
          alertDanger("Hubo un problema al registrar tus datos. Por favor, intentalo nuevamente.");
        }
      
      },
      (error) => {
        // Manejo de errores específicos del backend
        if ( error.status === 400 ) {
          // Manejo de error por duplicidad de correo electrónico
          alertDanger("Este correo electrónico ya está registrado en nuestro sistema.");
        } else {
          // Otros errores
          alertDanger("Hubo un problema al registrar tus datos. Por favor, intenta nuevamente.");
        }
      }
    );
  }
}
