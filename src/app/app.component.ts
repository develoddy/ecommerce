import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizationService } from './services/localization.service';

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
    private activatedRoute: ActivatedRoute,
    private localizationService: LocalizationService
  ) {
    // this.activatedRoute.paramMap.subscribe(params => {
    //   const country = params.get('country') || 'es';
    //   const locale = params.get('locale') || 'es';
    //   console.log("app.component.ts : ", country, locale);
    //   this.localizationService.setLocaleAndCountry(country, locale);
    // });

    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translate.get('app.title').subscribe((res: string) => {
        this.titleService.setTitle(res);
      });
    });
  }

  ngOnInit(): void {
    this.bodyClassService.updateBodyClass("index-demo1");
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
