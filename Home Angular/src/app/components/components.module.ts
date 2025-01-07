import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsRoutingModule } from './components-routing.module';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserDataComponent } from './user-data/user-data.component';
import { AddCameraComponent } from './add-camera/add-camera.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { WebSocketService } from '../service/websocket.service';
import { environment } from 'src/environment/environment';

// Correct URL configuration for your WebSocket server
const socketConfig: SocketIoConfig = {
  url: 'http://localhost:8000', // Backend server URL (where your Socket.IO server is running)
  options: {
    transports: ['websocket'], // Set the transport method
  },
};

@NgModule({
  declarations: [
    SidebarComponent,
    DashboardComponent,
    UserDataComponent,
    AddCameraComponent,
  ],
  imports: [
    CommonModule,
    ComponentsRoutingModule,
    NgxPaginationModule,
    FormsModule,
    ReactiveFormsModule,
    SocketIoModule.forRoot(socketConfig), // Ensure this is correct
  ],
  providers: [WebSocketService],
})
export class ComponentsModule {}
