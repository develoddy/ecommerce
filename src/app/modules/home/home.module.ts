import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { SliderHomeComponent } from './components/slider-home/slider-home.component';
import { CategoryListComponent } from './components/category-list/category-list.component';
import { ProductGridComponent } from './components/product-grid/product-grid.component';
import { SharedModule } from 'src/app/shared/shared.module';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from 'src/app/app.module';
import { FlashSaleComponent } from './components/flash-sale/flash-sale.component';
import { BrandMessageComponent } from './components/brand-message/brand-message.component';
import { ServiceSectionComponent } from './components/service-section/service-section.component';
import { CollectionBannersComponent } from './components/collection-banners/collection-banners.component';
import { FlashSaleBannerComponent } from './components/flash-sale-banner/flash-sale-banner.component';
import { TestimonialsComponent } from './components/testimonials/testimonials.component';
import { HodieGridComponent } from './components/hodie-grid/hodie-grid.component';
import { MugGridComponent } from './components/mug-grid/mug-grid.component';
import { CapGridComponent } from './components/cap-grid/cap-grid.component';


@NgModule({
  declarations: [
    HomeComponent,
    SliderHomeComponent,
    CategoryListComponent,
    ProductGridComponent,
    FlashSaleComponent,
    BrandMessageComponent,
    ServiceSectionComponent,
    CollectionBannersComponent,
    FlashSaleBannerComponent,
    TestimonialsComponent,
    HodieGridComponent,
    MugGridComponent,
    CapGridComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    SharedModule,
    //
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [ HttpClient ]
      }
    }),
  ]
})
export class HomeModule { }
