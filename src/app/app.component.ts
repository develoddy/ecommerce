import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
import { Router } from '@angular/router';

declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;//declare function HOMEINITTEMPLATE([]):any;
declare function sliderRefresh(): any;
declare function pswp([]):any;
declare function productZoom([]):any;

//declare function sideOffcanvasToggle([],[]):any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'ecommerce';

  constructor(
    private translate: TranslateService, 
    private router: Router,
    private titleService: Title, 
    private bodyClassService: BodyClassService,
  ) {
    // translate.addLangs(['en', 'es']);
    // const lang = translate.getBrowserLang();
    // if ( (lang !== 'es') && (lang !== 'en') ) {
    //   translate.setDefaultLang('es');
    // }
    // translate.setDefaultLang('es');
    // translate.use('es');

    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translate.get('app.title').subscribe((res: string) => {
        this.titleService.setTitle(res);
      });
    });
  }

  // ngAfterViewInit(): void {
  //   // Escuchar el evento de carga
  //   setTimeout(() => {
  //      HOMEINITTEMPLATE($);
  //      productZoom($);
  //      pswp($);
  //    }, 50);
  // }

  ngOnInit(): void {
    
    // Initialize body class based on the current route
    this.bodyClassService.updateBodyClass("index-demo1");
     
    // setTimeout(() => {
    //   sideOffcanvasToggle('.cart-dropdown-btn', '#cart-dropdown');
    // }, 50);
  }

 


  loadUserPreferences() {
    const country = localStorage.getItem('country');
    const language = localStorage.getItem('language');

    // Puedes usar las preferencias aquí, por ejemplo:
    console.log(`Usuario recurrente - País: ${country}, Idioma: ${language}`);
    
    // Opcional: redirigir directamente al `HomeComponent` o realizar cualquier otra configuración
    this.router.navigate(['/']);
  }

 
}
