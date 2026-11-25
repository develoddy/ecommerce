import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../../../shared/shared.module';
import { RouterModule, Routes } from '@angular/router';
import { StoreEditorialComponent } from './store-editorial.component';

const routes: Routes = [
  {
    path: '',
    component: StoreEditorialComponent
  }
];

@NgModule({
  declarations: [StoreEditorialComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule,
    TranslateModule
  ]
})
export class StoreEditorialModule {}
