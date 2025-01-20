import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginModule } from './login/login.module';
import { AuthGuard } from './service/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => LoginModule // Load LoginModule lazily
  },
  {
    path: '', redirectTo: 'login', pathMatch: 'full' // Default route to login
  },
  {
    path: 'sidebar', loadChildren: () => import('./components/components.module').then(m => m.ComponentsModule),
    canActivate: [AuthGuard]  // Lazy load components
  },
  {
    path: '**', redirectTo: 'login' // Catch-all wildcard, redirect to login
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
