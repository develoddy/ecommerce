import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-mini-color-drawer',
  templateUrl: './mini-color-drawer.component.html',
  styleUrls: ['./mini-color-drawer.component.css']
})
export class MiniColorDrawerComponent {

  // Recibe los colores desde el padre
  @Input() coloresDisponibles: { color: string, imagen: string }[] = [];
  @Input() selectedColor?: string; // ✅ Esto faltaba

  // Emite el color seleccionado al padre
  @Output() colorSelected = new EventEmitter<{ color: string, imagen: string }>();

  getColorHex(color: string) {
    // Aquí puedes mapear el nombre del color a un hex o devolver el mismo string
    return color;
  }

  selectColor(color: { color: string, imagen: string }) {
    this.colorSelected.emit(color);
    
    // Cerrar automáticamente el sidebar después de seleccionar
    this.closeSidebar();
  }

  private closeSidebar() {
    // Usar Bootstrap 5 Offcanvas API para cerrar programáticamente
    const offcanvasElement = document.getElementById('miniSwatchesColor-drawer');
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

  getSwatchClass(imagen: string, color: string): any {
    return {
      active: this.selectedColor === color, // marca el color activo
      'color-swatch': true,                  // clase base para todos los swatches
      [color.toLowerCase()]: true,           // clase opcional con nombre del color
    };
  }
}
