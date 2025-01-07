import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class InterceptorInterceptor implements HttpInterceptor {

  constructor() {}
  Token :any
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
     this.Token = localStorage.getItem('auth_token') 
    const clonedRequest = req.clone({
      headers: req.headers.set('Authorization',this.Token)
    })
    return next.handle(clonedRequest);
  }
}
