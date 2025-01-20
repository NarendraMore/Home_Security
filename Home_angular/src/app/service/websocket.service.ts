// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';  // import socket.io-client

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {

  constructor(private socket: Socket) {}

  // Method to listen for notifications
  listenForNotifications() {
    return this.socket.fromEvent<string>('newNotification'); // 'newNotification' is the event name
  }

  // Method to emit events if needed
  // sendNotification(message: string) {
  //   this.socket.emit('newNotification', message);
  // }
}
