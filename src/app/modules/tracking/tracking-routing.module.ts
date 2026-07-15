import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrackingSearchComponent } from './pages/tracking-search/tracking-search.component';
import { TrackingStatusComponent } from './pages/tracking-status/tracking-status.component';

/**
 * 📦 Rutas del módulo Tracking
 * Rutas públicas - Requieren token de seguridad
 */
const routes: Routes = [
  {
    path: '',
    component: TrackingSearchComponent
  },
  {
    path: ':orderId/:token',
    component: TrackingStatusComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrackingRoutingModule { }
