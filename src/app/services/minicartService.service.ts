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

  openMiniAddress() {
    // Abre el minicart utilizando Bootstrap
    const minicart = document.getElementById('miniAddress-drawer');
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

  /** Swatches Color **/
  openMiniSwatchesColor() {
    //alert("openMiniSwatchesColor desde el servicio");
    const miniSwatchesColor = document.getElementById('miniSwatchesColor-drawer');
    if (miniSwatchesColor) {
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(miniSwatchesColor);
      if (bsOffcanvas) {
        bsOffcanvas.show();
      } else {
        // Crear una nueva instancia si no existe
        new bootstrap.Offcanvas(miniSwatchesColor).show();
      }
    }
  }

  closeMiniSwatchesColor() {
    alert("closeMiniSwatchesColor desde el servicio");
  } 
  
  /** Swatches Size **/
  openMiniSwatchesSizes() {
    alert("openMiniSwatchesSizes desde el servicio");
  }

  closeMiniSwatchesSizes() {
    alert("closeMiniSwatchesSizes desde el servicio");
  }
}
