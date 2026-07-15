import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CompanyInfoService } from 'src/app/services/company-info.service';

@Component({
  selector: 'app-politica-cookies',
  templateUrl: './politica-cookies.component.html',
  styleUrls: ['./politica-cookies.component.scss']
})
export class PoliticaCookiesComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    public company: CompanyInfoService
  ) { }

  ngOnInit(): void {
    // SEO optimization
    this.titleService.setTitle('Política de Cookies - LUJANDEV');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Información detallada sobre el uso de cookies en LUJANDEV. Aprende cómo gestionar tus preferencias de cookies según RGPD y LSSI.' 
    });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // Scroll to top on component load
    window.scrollTo(0, 0);
  }

}
