import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent {
  @Input() isDesktop: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() products: any[] = [];
  @Output() openSidebar = new EventEmitter<void>();
  @Output() sortProducts = new EventEmitter<string>();

  currentSortBy: string = 'featured';

  onSortChange(event: any) {
    this.currentSortBy = event.target.value;
    this.sortProducts.emit(this.currentSortBy);
  }
}
