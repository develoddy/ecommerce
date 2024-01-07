import { Component, OnInit } from '@angular/core';
import { HomeService } from './_services/home.service';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
declare function ModalProductDetail():any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  sliders:any = [];
  categories:any = [];
  besProducts:any = [];
  ourProducts:any = [];
  product_selected:any=null;

  constructor(
    public homeService: HomeService,
  ) {}

  ngOnInit(): void {
    this.homeService.listHome().subscribe((resp:any) => {
      console.log(resp.categories);
      this.sliders = resp.sliders;
      this.categories = resp.categories;
      this.besProducts = resp.bes_products;
      this.ourProducts = resp.our_products;
      setTimeout(() => {
        HOMEINITTEMPLATE($)
      }, 50);
    });
  }

  openModal(besProduct:any) {
    this.product_selected = null;
    setTimeout(() => {
      this.product_selected = besProduct;
      setTimeout(() => {
        ModalProductDetail();
      }, 50);
    }, 150);
  }
}
