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

  touchedFields: { [key: string]: boolean } = {
    name: false,
    email: false,
    zipcode: false,
    phone: false,
    birthday: false,
    password: false,
    repeat_password: false,
};


  email:string = "";
  name:string = "";
  surname:string = "";
  password:string = "";
  repeat_password:string = "";
  zipcode:string = "";
  phone:string = "";
  birthday:string = "";
  success:boolean=false;

  errorName: boolean = false; // Para nombre
  errorEmail: boolean = false; // Para email
  errorZipcode: boolean = false; // Para código postal
  errorPhone: boolean = false; // Para móvil
  errorBirthday: boolean = false; // Para fecha de nacimiento
  errorPassword: boolean = false; // Para contraseña
  errorRepeatPassword: boolean = false; // Para repetir contraseña

  errorRegister:boolean=false;
  errorMessage:string="";
  CURRENT_USER_AUTHENTICATED:any=null;

  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService
  ) {
    translate.setDefaultLang('es');
  }

  ngOnInit(): void {
     this.verifyAuthenticatedUser();
  }

  getTranslatedCondition(): string {
    return this.translate.instant('auth_profile.register.condition');
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

  onInputChange(field: string) {

    this.touchedFields[field] = true; // Marcar el campo como tocado

    // Resetea el error específico del campo que está siendo editado
    if (field === 'name') this.errorName = !this.name;
    if (field === 'email') this.errorEmail = !this.email;
    if (field === 'zipcode') this.errorZipcode = !this.zipcode;
    //if (field === 'phone') this.errorPhone = !this.phone;
    if (field === 'phone') {
      //this.errorPhone = !this.validatePhone(this.phone); // Validar el móvil
      // Solo validamos el teléfono si hay un valor
      if (this.phone) {
        this.errorPhone = !this.validatePhone(this.phone); // Validar el móvil
      } else {
          this.errorPhone = true; // Si no hay valor, no mostrar error
      }
    }
    if (field === 'birthday') this.errorBirthday = !this.birthday;
    if (field === 'password') this.errorPassword = !this.password;
    if (field === 'repeat_password') this.errorRepeatPassword = !this.repeat_password;

    // Verificar si todos los campos tienen valor
    if (this.name && this.email && this.zipcode && this.phone &&
        this.birthday && this.password && this.repeat_password) {
        this.errorRegister = false; // Ocultar mensaje de error si todos los campos son válidos
    } else {
        this.errorRegister = true; // Mostrar mensaje de error si hay campos vacíos
    }
  }



  validatePhone(phone: string): boolean {
    // Expresión regular para validar el formato del móvil en España
    const phoneRegex = /^(?:\+34[67]\d{8}|6\d{8})$/; // Permite +34 seguido de 6 o 7 y 8 dígitos, o 6 seguido de 8 dígitos
    return phoneRegex.test(phone);
  }






  register() {

    // Resetear errores antes de la validación
    this.errorName = !this.name;
    this.errorEmail = !this.email;
    this.errorZipcode = !this.zipcode;
    this.errorPhone = !this.phone;
    this.errorBirthday = !this.birthday;
    this.errorPassword = !this.password;
    this.errorRepeatPassword = !this.repeat_password;

    // Comprobar si hay errores en los campos
    if (this.errorName || this.errorEmail || this.errorZipcode || this.errorPhone || 
        this.errorBirthday || this.errorPassword || this.errorRepeatPassword) {
        this.errorRegister = true;
        this.errorMessage = "Por favor, complete todos los campos obligatorios para continuar con el proceso.";
        return;
    }


    // if( !this.name ||  !this.email || !this.zipcode || !this.phone || !this.birthday || !this.password || !this.repeat_password ) {
    //     this.errorRegister = true;
    //     this.errorMessage = "Por favor, complete todos los campos obligatorios para continuar con el proceso.";
    //     return;
    // }

    if( this.password != this.repeat_password ) {
      //alertDanger("Ambas contraseñas deben ser iguales.");
      this.errorRegister = true;
      this.errorMessage = "Es necesario que ambas contraseñas coincidan para continuar con el registro.";
      return;
    }

    let data = {
      name: this.name ,
      email: this.email, 
      surname: "",
      password: this.password,
      repeat_password: this.repeat_password,
      zipcode: this.zipcode,
      phone: this.phone,
      birthday: this.birthday, // Asegúrate de que la API acepte birthday
      rol: "cliente"
    };

    this._authService.register(data).subscribe(
      (resp:any) => {
        if ( resp.status === 200 ) {
          // Registro exitoso, ahora intentamos loguear al usuario
          this._authService.login(this.email, this.password).subscribe(
            (loginResp: any) => {
              //if (loginResp === true) {
              if ( !loginResp.error && loginResp ) {
                // Login exitoso, redirige al usuario a la página de inicio
                this._router.navigate(['/']);
              } else {
                this.errorRegister = true;
                this.errorMessage = "Ha ocurrido un error durante el inicio de sesión posterior al registro. Por favor, inténtelo nuevamente.";
              }
            },
            (error) => {
              this.errorRegister = true;
              this.errorMessage = "Ha ocurrido un error durante el inicio de sesión posterior al registro. Por favor, inténtelo nuevamente.";
            }
          );


        } else {
          //alertDanger("Hubo un problema al registrar tus datos. Por favor, intentalo nuevamente.");
          this.errorRegister = true;
          this.errorMessage = "Se ha producido un inconveniente al registrar sus datos. Por favor, intente nuevamente.";
        }
      
      },
      (error) => {
        // Manejo de errores específicos del backend
        if ( error.status === 400 ) {
          // Manejo de error por duplicidad de correo electrónico
          //alertDanger("Este correo electrónico ya está registrado en nuestro sistema.");
          this.errorRegister = true;
          this.errorMessage = "El correo electrónico proporcionado ya se encuentra en uso en nuestro sistema.";
        } else {
          // Otros errores
          //alertDanger("Hubo un problema al registrar tus datos. Por favor, intenta nuevamente.");
          this.errorRegister = true;
          this.errorMessage = "Se ha producido un error al intentar registrar su información. Le solicitamos que lo intente de nuevo.";
        }
      }
    );
  }


  // Método para limpiar el formulario después de un registro exitoso
  resetForm() {
    this.email = '';
    this.name = '';
    this.surname = '';
    this.password = '';
    this.repeat_password = '';
    this.zipcode = '';
    this.phone = '';
    this.birthday = '';
  }
}
