import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './modules/auth-profile/_services/guards/auth.interceptor';
import { LoaderInterceptor } from './interceptors/loader.interceptor';
import { SharedModule } from './shared/shared.module';
import { ChatModule } from './modules/chat/chat.module';
import { RecaptchaModule, RecaptchaFormsModule, RECAPTCHA_V3_SITE_KEY } from 'ng-recaptcha';
import { FormsModule } from '@angular/forms';
import { SystemHealthComponent } from './components/system-health.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}


@NgModule({
  declarations: [
    AppComponent,
    SystemHealthComponent,
  ],
  imports: [
    RecaptchaModule,
    RecaptchaFormsModule,
    FormsModule,
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    TranslateModule.forRoot(),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [ HttpClient ]
      }
    }),
    AppRoutingModule,
    BrowserAnimationsModule,
    SharedModule,
  ChatModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor,
      multi: true
    }, {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: '6LfPI4UrAAAAAMdaK_k27wzNgVWAxkogIs_5MNda',
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

