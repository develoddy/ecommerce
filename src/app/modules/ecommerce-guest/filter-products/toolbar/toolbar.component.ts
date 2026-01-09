import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnChanges {
  @Input() isDesktop: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() products: any[] = [];
  @Output() openSidebar = new EventEmitter<void>();
  @Output() sortProducts = new EventEmitter<string>();
  @Input() currentGridView: any = { columns: 3 }; // Valor por defecto
  @Output() gridViewChange = new EventEmitter<number>();

  currentSortBy: string = 'featured';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentGridView'] && !changes['currentGridView'].firstChange) {
      console.log('🔄 Toolbar: currentGridView changed from', 
        changes['currentGridView'].previousValue, 
        'to', 
        changes['currentGridView'].currentValue);
    }
  }

  onSortChange(event: any) {
    this.currentSortBy = event.target.value;
    this.sortProducts.emit(this.currentSortBy);
  }

  setGridView(columns: number): void {
    this.gridViewChange.emit(columns);
  }

}
