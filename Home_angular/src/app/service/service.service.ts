import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpParams } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  private notificationReceived = new Subject<void>();

  notificationReceived$ = this.notificationReceived.asObservable();

  notifyDashboard(): void {
    this.notificationReceived.next();
  }
  constructor(private http: HttpClient) {}
  login(loginData: any): Observable<any> {
    return this.http.post(`${environment.url}/login`, loginData);
  }
  getIncedeentData(page: any, item: any) {
    console.log('page', page);

    return this.http.get(
      `${environment.url}/getIncidents?page=${page}&limit=${item}`
    );
  }
  registerNewuser(userData: FormData) {
    return this.http.post(`${environment.url}/register`, userData, {
      headers: { enctype: 'multipart/form-data' },
    });
  }

  getuserData() {
    return this.http.get(`${environment.url}/getUser`);
  }
  addCameraType(cameraData: any) {
    console.log('Sending Camera Data:', cameraData);
    return this.http.post(`${environment.url}/addCamera`, cameraData);
  }
  deleteUser(userId: any) {
    return this.http.delete(`${environment.url}/delete-user/${userId}`);
  }
  updateUser(UserId: string, userData: any) {
    return this.http.put(`${environment.url}/updateUser/${UserId}`, userData);
  }
}
