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
    if (this.authService.estaAutenticado()) {
      await this.notificationService.activarNotificaciones();
    }

    this.authService.taller$.subscribe(async (taller) => {
      if (taller) {
        await this.notificationService.activarNotificaciones();
      }
    });

    // Limpiar token FCM al cerrar sesión (sin ciclo de dependencia)
    this.authService.sesionCerrada$.subscribe(async () => {
      await this.notificationService.eliminarToken();
    });
  }
}