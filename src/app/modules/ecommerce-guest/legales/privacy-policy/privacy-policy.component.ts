import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CompanyInfoService } from 'src/app/services/company-info.service';
import { LocalizationService } from 'src/app/services/localization.service';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent implements OnInit {

  locale: string = "";
  country: string = "";

  constructor(
    private titleService: Title,
    private metaService: Meta,
    public company: CompanyInfoService,
    private localizationService: LocalizationService,
  ) { }

  ngOnInit(): void {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
    // Scroll al inicio de la página
    window.scrollTo(0, 0);

    // Configurar SEO
    this.titleService.setTitle('Política de Privacidad y Protección de Datos | LUJANDEV');
    
    this.metaService.updateTag({
      name: 'description',
      content: 'Política de Privacidad de LUJANDEV conforme al RGPD y LOPDGDD. Información sobre tratamiento de datos personales, derechos ARCO, cookies, y protección de datos en nuestra tienda online.'
    });

    this.metaService.updateTag({
      name: 'robots',
      content: 'index, follow'
    });
  }

}
