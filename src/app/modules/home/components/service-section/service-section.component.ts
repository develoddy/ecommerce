import { Component } from '@angular/core';

interface ServiceFeature {
  icon: string;
  title: string;
  description: string;
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
      title: 'Atención real',
      description: 'Estamos contigo.'
    },
    {
      icon: 'icon anm anm-truck-l',
      title: 'Envío + seguimiento',
      description: 'Sabes dónde está.'
    },
    {
      icon: 'icon anm anm-credit-card-l',
      title: 'Pago seguro',
      description: 'Sin historias.'
    },
    {
      icon: 'icon anm anm-redo-l',
      title: 'Devoluciones fáciles',
      description: 'Sin complicaciones.'
    }
  ];

  constructor() { }

}