import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LocalizationService } from 'src/app/services/localization.service';

@Component({
  selector: 'app-auth-profile',
  templateUrl: './auth-profile.component.html',
  styleUrls: ['./auth-profile.component.css']
})
export class AuthProfileComponent {

  locale: string = "";
    country: string = "";  
  
    constructor(
       private router: Router,
      private localizationService: LocalizationService,
    ) {
  
      this.country = this.localizationService.country;
      this.locale = this.localizationService.locale;
    }

  handleForceLogin() {
    console.log("handleForceLogin. login");
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
    });
  }

}
