import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';
declare function alertSuccess([]):any;


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  password:string = "";

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  flagSendEmail: Boolean = false;

  public loading: boolean = false;

  constructor(
    public _authService: AuthService,
    public _router: Router,
  ) {}


  ngOnInit(): void {
    this.checkDeviceType();
  }

  updatePassword() {
    
      if (this.password) {
        this._authService.requestPasswordReset(this.password).subscribe(
          (response) => {
            this.flagSendEmail = true;
            alertSuccess(['Te hemos enviado un email para restablecer tu contraseña.']);
          },
          (error) => {
            alertSuccess(['Ocurrió un error al enviar el email.']);
            console.error(error);
          }
        );
      } else {
        alertSuccess(['Por favor, introduce tu email.']);
      }
    
  }

  private checkDeviceType(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
    this.isDesktop = width > 768;
  }

}
