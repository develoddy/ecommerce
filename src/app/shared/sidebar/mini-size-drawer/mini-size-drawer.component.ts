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

  // Emitimos la talla seleccionada al padre
  @Output() variedadSeleccionada = new EventEmitter<{ variedad: any, index: number }>();

  // Opcional: para marcar error en selección
  @Input() tallaError: boolean = false;

  selectedVariedad(variedad: any, index: number) {
    this.variedadSeleccionada.emit({ variedad, index });
  }

}
