import { Component, OnInit } from '@angular/core';
import { EcommerceAuthService } from '../_services/ecommerce-auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-order-success',
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css']
})
export class OrderSuccessComponent implements OnInit {

  euro = "€";
  sale: any;
  saleDetails: any =[];
  
  constructor(
    private route: ActivatedRoute,
    public _ecommerceAuthService: EcommerceAuthService,
    
  ) {}

  ngOnInit(): void {
    const state = history.state;
    this.sale = state.sale;
    this.saleDetails = state.saleDetails;
  }

}
