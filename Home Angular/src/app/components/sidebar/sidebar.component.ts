// sidebar.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { ServiceService } from 'src/app/service/service.service';
import { WebSocketService } from 'src/app/service/websocket.service';

export interface IncidentData {
  incident_type: string;
  time: string;
  date: string;
  _id: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  incidentDataArray: IncidentData[] = [];
  searchText: string = '';
  p: number = 1;
  isNotificationOpen = false;
  notifications: string[] = [];
  notificationCount = 0;
  showNotificationPreview = false;
  selectedNotification: string | null = null;
  selectedNotificationIndex: number | null = null;

  private notificationSound = new Audio('assets/sounds/notification.mp3');

  constructor(
    private router: Router,
    private authService: AuthService,
    private webSocketService: WebSocketService,
    private service: ServiceService
  ) {}

  ngOnInit(): void {
    // Subscribe to the WebSocket event to get notifications
    this.webSocketService
      .listenForNotifications()
      .subscribe((response: any) => {
        console.log('New Notification:', response);

        // Prevent duplicate notifications
        if (!this.notifications.includes(response.message)) {
          this.notifications.push(response.message);
          this.notificationCount = this.notifications.length; // Update count
          // Optionally play notification sound
          this.playNotificationSound(); 

          this.service.notifyDashboard();
        }
      });
  }

  onclickLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  displayUser(): void {
    this.router.navigate(['/sidebar/user']);
  }

  dispalyCameraAdd(): void {
    this.router.navigate(['/sidebar/camera']);
  }

  displayDashbord(): void {
    this.router.navigate(['/sidebar/dashboard']);
  }

  toggleNotification(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  showPreview(notification: string, index: number): void {
    this.selectedNotification = notification;
    this.selectedNotificationIndex = index;
    this.showNotificationPreview = true;
  }

  closePreview(): void {
    if (this.selectedNotificationIndex !== null) {
      // Remove the notification from the array
      this.notifications.splice(this.selectedNotificationIndex, 1);
      this.notificationCount = this.notifications.length;
      this.selectedNotification = null;
      this.selectedNotificationIndex = null;
      this.showNotificationPreview = false;
    }
  }

  private playNotificationSound(): void {
    this.notificationSound.load();
    this.notificationSound.play().catch((err) => {
      console.error('Failed to play notification sound:', err);
    });
  }
}
