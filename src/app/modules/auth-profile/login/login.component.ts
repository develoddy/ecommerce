import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_sercices/auth.service';
import { Router } from '@angular/router';

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
    public _router: Router
  ) { }

  ngOnInit(): void {
    //console.log(this._authService.user);
  }

  login() {
    if (!this.email) {
      alert("Es necesario ingresar el email");
    }

    if (!this.password) {
      alert("Es necesario ingresar el password");
    }

    this._authService.login(this.email, this.password).subscribe((resp:any) => {
      console.log(resp);
      // SI NO TIENE UN ERROR Y LA RESPUESTA ES VERDADERA
      // SIGNIFICA QUE EL USUARIO SE LOGUEO CORRECTAMENTE
       if (!resp.error && resp) {
        this._router.navigate(["/"]);
      } else {
        alert(resp.error.message)
      }
    });
  }

}
