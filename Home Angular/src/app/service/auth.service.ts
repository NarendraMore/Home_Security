import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) { }

  // Login method to authenticate the user
  login(credentials: any) {
    return this.http.post(`${environment.url}/login`, credentials);
  }

  // Set the JWT token in localStorage
  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  // Set the user role in localStorage
  setRole(role: string) {
    localStorage.setItem('user_role', role);
  }

  // Get the stored JWT token
  getToken() {
    return localStorage.getItem('auth_token');
  }

  // Get the stored user role
  getUserRole() {
    return localStorage.getItem('user_role');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Remove token and role on logout
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
  }
}
