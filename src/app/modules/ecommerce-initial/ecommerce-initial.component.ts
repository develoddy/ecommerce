import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PrelaunchConfigService } from '../../services/prelaunch-config.service';

@Component({
  selector: 'app-ecommerce-initial',
  templateUrl: './ecommerce-initial.component.html',
  styleUrls: ['./ecommerce-initial.component.css']
})
export class EcommerceInitialComponent implements OnInit {
  isPrelaunchMode = false;

  constructor(
    private route: ActivatedRoute,
    private prelaunchConfigService: PrelaunchConfigService
  ) { }

  ngOnInit(): void {
    // Obtener el estado del resolver
    this.route.data.subscribe(data => {
      this.isPrelaunchMode = data.prelaunchData?.isPrelaunchMode || false;
      console.log('🔧 EcommerceInitialComponent - Modo:', this.isPrelaunchMode ? 'PRE-LAUNCH' : 'TIENDA COMPLETA');
    });

    // Suscribirse a cambios dinámicos del estado
    this.prelaunchConfigService.isPrelaunchEnabled$.subscribe(enabled => {
      this.isPrelaunchMode = enabled;
    });
  }

}
