import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-mini-size-drawer',
  templateUrl: './mini-size-drawer.component.html',
  styleUrls: ['./mini-size-drawer.component.css']
})
export class MiniSizeDrawerComponent {

  // Recibe las tallas disponibles desde el padre
  @Input() variedades: any[] = [];

  // Recibe la talla seleccionada para marcarla
  @Input() variedad_selected?: { valor: string, stock: number };

  // Recibe el color seleccionado para mostrar mensajes contextuales
  @Input() selectedColor?: string;

  // Emitimos la talla seleccionada al padre
  @Output() variedadSeleccionada = new EventEmitter<{ variedad: any, index: number }>();

  // Opcional: para marcar error en selección
  @Input() tallaError: boolean = false;

  selectedVariedad(variedad: any, index: number) {
    this.variedadSeleccionada.emit({ variedad, index });
    
    // Cerrar automáticamente el sidebar después de seleccionar
    this.closeSidebar();
  }

  private closeSidebar() {
    // Usar Bootstrap 5 Offcanvas API para cerrar programáticamente
    const offcanvasElement = document.getElementById('miniSwatchesSizes-drawer');
    if (offcanvasElement) {
      const bsOffcanvas = (window as any).bootstrap?.Offcanvas?.getInstance(offcanvasElement);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      } else {
        // Fallback: simular click en el botón close
        const closeButton = offcanvasElement.querySelector('.close-cart');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        }
      }
    }
  }

}
