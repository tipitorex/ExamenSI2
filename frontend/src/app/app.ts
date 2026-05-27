// src/app/app.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FirebaseNotificationService } from './services/firebase-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App implements OnInit {
  constructor(
    private authService: AuthService,
    private notificationService: FirebaseNotificationService
  ) {}

  async ngOnInit() {
    // Si el usuario ya está autenticado (por ejemplo, después de recargar)
    if (this.authService.estaAutenticado()) {
      console.log('🚀 Usuario autenticado, activando notificaciones...');
      await this.notificationService.activarNotificaciones();
    }

    // Escuchar cambios de autenticación (cuando el usuario inicia sesión)
    this.authService.taller$.subscribe(async (taller) => {
      if (taller) {
        console.log('🔔 Usuario logueado, activando notificaciones...');
        await this.notificationService.activarNotificaciones();
      } else {
        console.log('🔕 Usuario cerró sesión');
      }
    });
  }
}