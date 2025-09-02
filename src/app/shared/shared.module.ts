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

@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    AddToCartModalComponent
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
    AddToCartModalComponent
  ]
})
export class SharedModule { }
