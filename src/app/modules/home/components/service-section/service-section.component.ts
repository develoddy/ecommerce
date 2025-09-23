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
      title: 'Contáctanos cuando quieras',
      description: 'Atención al cliente 24/7 por email.'
    },
    {
      icon: 'icon anm anm-truck-l',
      title: 'Envío rápido y seguimiento incluido',
      description: 'Tu pedido se fabrica y envía directamente a tu puerta.'
    },
    {
      icon: 'icon anm anm-credit-card-l',
      title: 'Pago 100% seguro',
      description: 'Paga con tarjeta de crédito o débito, o con tu cuenta PayPal.'
    },
    {
      icon: 'icon anm anm-redo-l',
      title: 'Devoluciones fáciles',
      description: 'Tienes 30 días para solicitar cambios o devoluciones.'
    }
  ];

  constructor() { }

}