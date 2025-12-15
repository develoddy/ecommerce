import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from '../app.module';
import { AddToCartModalComponent } from './modals/add-to-cart-modal/add-to-cart-modal.component';
import { RelatedProductsComponent } from './related-products/related-products.component';
import { InterestProductsComponent } from './interest-products/interest-products.component';
import { ProductSliderSkeletonComponent } from './skeleton-loader/product-slider-skeleton/product-slider-skeleton.component';
import { ProductSingleSkeletonComponent } from './skeleton-loader/product-single-skeleton/product-single-skeleton.component';
import { MiniColorDrawerComponent } from './sidebar/mini-color-drawer/mini-color-drawer.component';
import { MiniSizeDrawerComponent } from './sidebar/mini-size-drawer/mini-size-drawer.component';
import { SizeGuideModalComponent } from './sidebar/size-guide-modal/size-guide-modal.component';
import { BrandMessageComponent } from './brand-message/brand-message.component';

@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    AddToCartModalComponent,
    RelatedProductsComponent,
    InterestProductsComponent,
    ProductSliderSkeletonComponent,
    ProductSingleSkeletonComponent,
    MiniColorDrawerComponent,
    MiniSizeDrawerComponent,
    SizeGuideModalComponent,
    BrandMessageComponent,
  ],
  imports: [
    CommonModule,
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
  ], 
  exports: [
    HeaderComponent,
    FooterComponent,
    AddToCartModalComponent,
    RelatedProductsComponent,
    InterestProductsComponent,
    ProductSliderSkeletonComponent,
    ProductSingleSkeletonComponent,
    MiniColorDrawerComponent,
    MiniSizeDrawerComponent,
    SizeGuideModalComponent,
    BrandMessageComponent
  ]
})
export class SharedModule { }
