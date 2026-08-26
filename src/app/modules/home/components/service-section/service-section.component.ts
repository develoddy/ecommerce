import { Component } from '@angular/core';

interface ServiceFeature {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-service-section',
  templateUrl: './service-section.component.html',
  styleUrls: ['./service-section.component.scss']
})
export class ServiceSectionComponent {
  
  services: ServiceFeature[] = [
    {
      icon: 'icon anm anm-phone-call-l',
      titleKey: 'home.service_section.support.title',
      descriptionKey: 'home.service_section.support.description'
    },
    {
      icon: 'icon anm anm-truck-l',
      titleKey: 'home.service_section.shipping.title',
      descriptionKey: 'home.service_section.shipping.description'
    },
    {
      icon: 'icon anm anm-credit-card-l',
      titleKey: 'home.service_section.payment.title',
      descriptionKey: 'home.service_section.payment.description'
    },
    {
      icon: 'icon anm anm-redo-l',
      titleKey: 'home.service_section.returns.title',
      descriptionKey: 'home.service_section.returns.description'
    }
  ];

  constructor() { }

}