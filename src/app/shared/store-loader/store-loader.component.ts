import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-store-loader',
  templateUrl: './store-loader.component.html',
  styleUrls: ['./store-loader.component.css']
})
export class StoreLoaderComponent {
  @Input() titleKey = 'home.loading.title';
  @Input() descriptionKey = 'home.loading.description';
}
