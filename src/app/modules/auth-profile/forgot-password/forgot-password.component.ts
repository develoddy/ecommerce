import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit  
{

  email:string = "";

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  flagSendEmail: Boolean = false;

  public loading: boolean = false;

  constructor(
    public _authService: AuthService,
    public _router: Router,
    public translate: TranslateService
  ) { 
    //translate.setDefaultLang('es');
  }

  ngOnInit(): void {
    this._authService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });

    this.checkDeviceType();
  }

  sendEmail() {
    if (this.email) {
      this._authService.requestPasswordReset(this.email).subscribe(
        (response) => {          
          // Manejar la respuesta según tu API
          this.flagSendEmail = true;
          alertSuccess(['Te hemos enviado un email para restablecer tu contraseña.']);
        },
        (error) => {
          alertDanger(['Ocurrió un error al enviar el email.']);
          console.error(error);
        }
      );
    } else {
      alertWarning(['Por favor, introduce tu email.']);
    }
  }

  login() {
  }

  

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
  }

}
