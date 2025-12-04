import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CompanyInfoService } from 'src/app/services/company-info.service';
import { LocalizationService } from 'src/app/services/localization.service';

@Component({
  selector: 'app-condiciones-venta',
  templateUrl: './condiciones-venta.component.html',
  styleUrls: ['./condiciones-venta.component.scss']
})
export class CondicionesVentaComponent implements OnInit {

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
    // SEO optimization
    this.titleService.setTitle('Condiciones Generales de Venta - LUJANDEV');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Condiciones generales de venta de LUJANDEV. Información sobre dropshipping, envíos, derecho de desistimiento, garantías y devoluciones.' 
    });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // Scroll to top on component load
    window.scrollTo(0, 0);
  }

}
