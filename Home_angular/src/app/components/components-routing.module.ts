import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserDataComponent } from './user-data/user-data.component';
import { AddCameraComponent } from './add-camera/add-camera.component';
import { AuthGuard } from '../service/auth.guard';

const routes: Routes = [
  {
    path: '', component: SidebarComponent, canActivate: [AuthGuard], // Protect the Sidebar route
    children: [
      {
        path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] // Protect dashboard route
      },
      {
        path: 'user', component: UserDataComponent, canActivate: [AuthGuard] // Protect user data route
      },
      {
        path: 'camera', component: AddCameraComponent, canActivate: [AuthGuard] // Protect add camera route
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComponentsRoutingModule { }
