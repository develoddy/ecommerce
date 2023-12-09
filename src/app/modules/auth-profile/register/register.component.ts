import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';

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
    public _router: Router
  ){}

  ngOnInit(): void {
    if (this._authService.user) {
      this._router.navigate(['/']);
    }
  }

  register() {
    if(
      !this.email ||
      !this.name ||
      !this.surname ||
      !this.password ||
      !this.repeat_password) {
        alert("Todos los campos son requeridos");
    }

    if(this.password != this.repeat_password) {
      alert("Las contraseñas deben ser iguales");
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
    });
  }
}
