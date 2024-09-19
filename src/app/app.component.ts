import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function pswp([]):any;

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

  ngOnInit(): void {

    // Initialize body class based on the current route
    this.bodyClassService.updateBodyClass("index-demo1");
    // setTimeout(() => {
    //    HOMEINITTEMPLATE($);
    //    pswp($);
    // }, 50);
    
    // setTimeout(() => {
    //   sideOffcanvasToggle('.cart-dropdown-btn', '#cart-dropdown');
    // }, 50);
  }
}
