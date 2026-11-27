import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { TrackingRoutingModule } from './tracking-routing.module';
import { TrackingSearchComponent } from './pages/tracking-search/tracking-search.component';
import { TrackingStatusComponent } from './pages/tracking-status/tracking-status.component';
import { TrackingService } from './services/tracking.service';
import { SharedModule } from '../../shared/shared.module';

/**
 * 📦 Módulo de Tracking
 * Módulo público para tracking de pedidos
 * Sigue la arquitectura del módulo Printful
 * 
 * Características:
 * - Rutas públicas (no requiere auth)
 * - Llamadas directas a API Printful via backend
 * - Combina datos Printful + BD local
 * - UX estilo Amazon
 */
@NgModule({
  declarations: [
    TrackingSearchComponent,
    TrackingStatusComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    HttpClientModule,
    TrackingRoutingModule,
    SharedModule
  ],
  providers: [
    TrackingService
  ]
})
export class TrackingModule { }
