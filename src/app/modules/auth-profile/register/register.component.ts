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
        alertDanger("Todos los campos son requeridos");
        return;
    }

    if(this.password != this.repeat_password) {
      alertDanger("Las contraseñas deben ser iguales");
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

    this._authService.register(data).subscribe((resp:any) => {
      console.log(resp);
      alertSuccess("Muy bien! Tus datos se han registrado correctamente.");
      this.email = '';
      this.name = '';
      this.surname = '';
      this.password = '';
      this.repeat_password = '';
    });
  }
}
