import { Injectable, RendererFactory2 } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';

declare const bootstrap: any;

@Injectable({
  providedIn: 'root'
})
export class MinicartService {

  constructor(private router: Router) {
    // Suscribirse a los eventos de navegación
    this.router.events.subscribe(event => {
        if (event instanceof NavigationStart) {
          this.closeMinicart();
        }
    });
  }

  closeMinicart() {
    // Cierra el minicart utilizando Bootstrap
    const minicart = document.getElementById('minicart-drawer');
    if (minicart) {
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(minicart);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      } else {
        // Crear una nueva instancia si no existe
        new bootstrap.Offcanvas(minicart).hide();
      }
    }
  }

  openMinicart() {
    // Abre el minicart utilizando Bootstrap
    const minicart = document.getElementById('minicart-drawer');
    if (minicart) {
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(minicart);
      if (bsOffcanvas) {
        bsOffcanvas.show();
      } else {
        // Crear una nueva instancia si no existe
        new bootstrap.Offcanvas(minicart).show();
      }
    }
  }


  closeMiniAddress() {
    // Cierra el minicart utilizando Bootstrap
    const minicart = document.getElementById('miniAddress-drawer');
    if (minicart) {
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(minicart);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      } else {
        // Crear una nueva instancia si no existe
        new bootstrap.Offcanvas(minicart).hide();
      }
    }
  }
  
}
