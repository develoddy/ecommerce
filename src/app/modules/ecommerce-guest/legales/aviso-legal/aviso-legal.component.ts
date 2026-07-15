import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CompanyInfoService } from 'src/app/services/company-info.service';
import { LocalizationService } from 'src/app/services/localization.service';

@Component({
  selector: 'app-aviso-legal',
  templateUrl: './aviso-legal.component.html',
  styleUrls: ['./aviso-legal.component.scss']
})
export class AvisoLegalComponent implements OnInit {

    locale: string = "";
  country: string = "";

  constructor(
    private titleService: Title,
    private metaService: Meta,
    public company: CompanyInfoService,
    private localizationService: LocalizationService
  ) { }

  ngOnInit(): void {

    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;

    // SEO optimization
    this.titleService.setTitle('Aviso Legal - LUJANDEV');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Aviso legal de LUJANDEV, ecommerce de productos personalizados con modelo dropshipping. Información sobre el titular del sitio web según LSSI.' 
    });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // Scroll to top on component load
    window.scrollTo(0, 0);
  }

}
