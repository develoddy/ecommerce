import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BodyClassService } from './services/body-class.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizationService } from './services/localization.service';
import { GuestCleanupService } from './modules/ecommerce-guest/_service/guestCleanup.service';
import { HeaderEventsService } from './services/headerEvents.service';

declare var $:any;
declare function HOMEINITTEMPLATE($: any): any;//declare function HOMEINITTEMPLATE([]):any;
declare function sliderRefresh(): any;
declare function pswp([]):any;
declare function productZoom([]):any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  title = 'ecommerce';
  locale: string = "";
  country: string = "";  

  constructor(
    private translate: TranslateService, 
    private router: Router,
    private titleService: Title, 
    private bodyClassService: BodyClassService,
    private localizationService: LocalizationService,
    private headerEventsService: HeaderEventsService
  ) {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.translate.get('app.title').subscribe((res: string) => {
        this.titleService.setTitle(res);
      });
    });

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }

  ngOnInit(): void {
    this.bodyClassService.updateBodyClass("index-demo1");
    this.headerEventsService.forceLogin$.subscribe(() => {
      this.handleForceLogin();
    });
  }

  handleForceLogin() {
    console.log("-----> Desde app.compoente se llamada el inicio de session y tiene q tener reloaddd...");
    this.router.navigate(['/', this.country, this.locale,  'auth', 'login']).then(() => {window.location.reload();});
  }
  
}

