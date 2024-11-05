import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

declare function alertSuccess([]):any;


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  token: string | null = null;
  newPassword : string | null = null;
  email:string = "";

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  flagSuccessReset: Boolean = false;

  public loading: boolean = false;

  private subscriptions: Subscription = new Subscription();

  constructor(
    public _authService: AuthService,
    public _router: Router,
    private routerActived: ActivatedRoute
  ) {}


  ngOnInit(): void {
    const routeParamsSubscription = this.routerActived.params.subscribe((resp: any) => {
      this.token = resp["token"];
      this.email = resp["email"];
    });
    this.subscriptions.add(routeParamsSubscription);
    
    this.checkDeviceType();
  }

  updatePassword() {
    if (this.newPassword && this.token) {
        this._authService.resetPassword(this.token, this.newPassword).subscribe(
          (response) => {
            this.flagSuccessReset = true;
            alertSuccess(['Tu contraseña ha sido actualizada con éxito']);
          },
          (error) => {
            alertSuccess(['Ocurrió un error al actualizar la contraseña']);
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
