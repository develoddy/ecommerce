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


@NgModule({
  declarations: [
    HomeComponent,
    SliderHomeComponent,
    CategoryListComponent,
    ProductGridComponent
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
