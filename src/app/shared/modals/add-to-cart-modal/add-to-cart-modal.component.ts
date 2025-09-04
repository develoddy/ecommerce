import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-add-to-cart-modal',
  templateUrl: './add-to-cart-modal.component.html',
  styleUrls: ['./add-to-cart-modal.component.scss']
})
export class AddToCartModalComponent {
  @Input() product_selected: any;
  @Input() variedades: any[] = [];
  @Input() euro: string = '';
}
