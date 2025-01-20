import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgxPaginationModule } from 'ngx-pagination';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { environment } from 'src/environment/environment';
import { WebSocketService } from './service/websocket.service';
import { InterceptorInterceptor } from './interceptor.interceptor'
// const config: SocketIoConfig = { url: `${environment.url}`, options: {} };
const config: SocketIoConfig = {
  url: 'http://localhost:8000', // Your server's URL
  options: {
    transports: ['websocket'], // Optional: specify websocket transport
  },
};
@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgxPaginationModule,
    SocketIoModule.forRoot(config),
  
  ],
  providers: [WebSocketService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: InterceptorInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
