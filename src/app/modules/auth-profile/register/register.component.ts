import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { LocalizationService } from 'src/app/services/localization.service';
import { Subscription } from 'rxjs';

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {

  touchedFields: { [key: string]: boolean } = {
    email: false,
    password: false,
    repeat_password: false,
  };

  locale: string = "";
  country: string = "";
  private subscriptions: Subscription = new Subscription();
  
  
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  email:string = "";
  password:string = "";
  repeat_password:string = "";
  success:boolean=false;

  errorEmail: boolean = false; // Para email
  errorPassword: boolean = false; // Para contraseña
  errorRepeatPassword: boolean = false; // Para repetir contraseña

  errorRegister:boolean=false;
  errorMessage:string="";
  CURRENT_USER_AUTHENTICATED:any=null;

  public loading: boolean = false;

  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService,
    public routerActived: ActivatedRoute,
    private recaptchaV3Service: ReCaptchaV3Service,
    private localizationService: LocalizationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {

    // Subscribe to LocalizationService for reactive country/locale updates
    this.subscriptions.add(
      this.localizationService.country$.subscribe(country => {
        this.country = country;
      })
    );

    this.subscriptions.add(
      this.localizationService.locale$.subscribe(locale => {
        this.locale = locale;
      })
    );

    this._authService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

     this.verifyAuthenticatedUser();
     this.checkDeviceType();
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
    if (field === 'email') this.errorEmail = !this.email;
    if (field === 'password') this.errorPassword = !this.password;
    if (field === 'repeat_password') this.errorRepeatPassword = !this.repeat_password;

    // Solo resetear el error de registro si ya estaba visible
    if (this.errorRegister) {
      // Verificar si todos los campos tienen valor para ocultar el mensaje de error
      if (this.email && this.password && this.repeat_password) {
          this.errorRegister = false; // Ocultar mensaje de error si todos los campos son válidos
      }
    }
  }

  register() {
    // Resetear errores antes de la validación
    this.errorEmail = !this.email;
    this.errorPassword = !this.password;
    this.errorRepeatPassword = !this.repeat_password;

    // Comprobar si hay errores en los campos
    if (this.errorEmail || this.errorPassword || this.errorRepeatPassword) {
        this.errorRegister = true;
        this.errorMessage = "Por favor, complete todos los campos obligatorios para continuar con el proceso.";
        return;
    }

    if( this.password != this.repeat_password ) {
      //alertDanger("Ambas contraseñas deben ser iguales.");
      this.errorRegister = true;
      this.errorMessage = "Es necesario que ambas contraseñas coincidan para continuar con el registro.";
      return;
    }

    // Ejecutar reCAPTCHA v3 antes de enviar datos al servidor
    this.recaptchaV3Service.execute('registro').subscribe((token: string) => {
      // Generar name automáticamente desde el email (parte antes del @)
      const generatedName = this.email.split('@')[0] || 'usuario';
      
      const data = {
        name: generatedName,
        email: this.email, 
        surname: "",
        password: this.password,
        repeat_password: this.repeat_password,
        zipcode: "",
        phone: "",
        birthday: "",
        rol: "cliente",
        recaptchaToken: token
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
    });
  }


  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
  }

  clearField(fieldName: string) {
    switch(fieldName) {
      case 'email':
        this.email = '';
        break;
      case 'password':
        this.password = '';
        break;
      case 'repeat_password':
        this.repeat_password = '';
        break;
    }
    
    // Limpiar también los errores del campo específico
    this.touchedFields[fieldName] = false;
    this.resetFieldError(fieldName);
  }

  private resetFieldError(fieldName: string) {
    switch(fieldName) {
      case 'email':
        this.errorEmail = false;
        break;
      case 'password':
        this.errorPassword = false;
        break;
      case 'repeat_password':
        this.errorRepeatPassword = false;
        break;
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
