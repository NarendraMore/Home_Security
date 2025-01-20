import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if the user is authenticated by verifying the token
    const token = this.authService.getToken();
    if (token) {
      return true; // If token exists, allow access to the route
    } else {
      // If token doesn't exist, redirect to login page
      this.router.navigate(['/login']);
      return false;
    }
  }
}
