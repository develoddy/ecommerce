import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-delivery',
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.css']
})
export class DeliveryComponent implements OnInit {


  locale: string = "";
  country: string = "";
  constructor(
    public routerActived: ActivatedRoute,
  ) { 
    this.routerActived.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado
      this.country = params.get('country') || 'es'; // Valor predeterminado
    });
  }

  ngOnInit(): void {
  }

}
