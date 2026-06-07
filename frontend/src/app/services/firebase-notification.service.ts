// src/app/services/firebase-notification.service.ts
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseNotificationService {
  private messaging: any;
  private apiUrl = 'http://localhost:8000/api/v1/dispositivos';
  private serviceWorkerRegistered = false;
  private mensajesEscuchando = false;
  private authService: AuthService;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    this.initFirebase();
    this.authService = this.injector.get(AuthService);
  }

  private initFirebase() {
    try {
      const app = initializeApp(environment.firebaseConfig);
      this.messaging = getMessaging(app);
      console.log('✅ Firebase inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
    }
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (this.serviceWorkerRegistered) {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      return registration || null;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registrado:', registration);
        this.serviceWorkerRegistered = true;
        return registration;
      } catch (error) {
        console.error('❌ Error registrando Service Worker:', error);
        return null;
      }
    }
    return null;
  }

  async activarNotificaciones(): Promise<string | null> {
    if (!this.authService.estaAutenticado()) {
      console.warn('⚠️ Usuario no autenticado');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('⚠️ Este navegador no soporta notificaciones');
      return null;
    }

    if (Notification.permission === 'granted') {
      return this.obtenerToken();
    }

    if (Notification.permission === 'denied') {
      console.warn('⚠️ Permiso de notificaciones denegado');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return this.obtenerToken();
    }
    
    return null;
  }

  private async obtenerToken(): Promise<string | null> {
    try {
      const swRegistration = await this.registerServiceWorker();
      
      const token = await getToken(this.messaging, {
        vapidKey: environment.vapidKey,
        serviceWorkerRegistration: swRegistration || undefined
      });

      if (token) {
        console.log('✅ Token FCM obtenido:', token);
        localStorage.setItem('fcm_token_web', token);
        await this.enviarTokenAlBackend(token);
        this.listenForMessages();
        return token;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      return null;
    }
  }

  private async enviarTokenAlBackend(token: string): Promise<void> {
    // taller_id desde localStorage disponible inmediatamente (incluso tras reload)
    const tallerIdStr = localStorage.getItem('taller_id');
    if (!tallerIdStr) {
      console.warn('⚠️ No hay taller_id disponible para registrar token FCM');
      return;
    }
    const tallerId = parseInt(tallerIdStr, 10);
    const headers = this.authService.obtenerHeadersAuth();

    try {
      await this.http.post(`${this.apiUrl}/registrar-web`, {
        fcm_token: token,
        taller_id: tallerId
      }, { headers }).toPromise();
      console.log('✅ Token FCM enviado al backend para taller', tallerId);
    } catch (error) {
      console.error('❌ Error enviando token al backend:', error);
    }
  }

  async eliminarToken(): Promise<void> {
    try {
      const token = localStorage.getItem('fcm_token_web');
      if (token) {
        const taller = this.authService.obtenerTallerActual();
        const headers = this.authService.obtenerHeadersAuth();
        await this.http.post(`${this.apiUrl}/eliminar-web`, {
          fcm_token: token,
          taller_id: taller?.id
        }, { headers }).toPromise();
        localStorage.removeItem('fcm_token_web');
        console.log('✅ Token eliminado del backend');
      }
      
      if (this.messaging) {
        await deleteToken(this.messaging);
        console.log('✅ Token eliminado de Firebase');
      }
    } catch (error) {
      console.error('❌ Error eliminando token:', error);
    }
  }

  listenForMessages(): void {
    if (!this.messaging || this.mensajesEscuchando) return;
    this.mensajesEscuchando = true;

    onMessage(this.messaging, async (payload) => {
      console.log('📨 Notificación en primer plano:', payload);

      if (!payload.notification) return;

      const titulo = payload.notification.title || 'Nueva notificación';
      const opciones: NotificationOptions = {
        body: payload.notification.body || 'Tienes una nueva notificación',
        icon: payload.notification.icon || '/favicon.ico',
        data: payload.data,
        requireInteraction: true
      };

      // Usar el service worker para mostrar la notificación (funciona en Chrome)
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(titulo, opciones);
      } catch {
        // Fallback a Notification API si el SW no está disponible
        const notif = new Notification(titulo, opciones);
        notif.onclick = () => {
          window.focus();
          const incidenteId = payload.data?.['incidente_id'];
          const facturaId = payload.data?.['factura_id'];
          if (incidenteId) window.location.href = `/#/dashboard/emergencia/${incidenteId}`;
          else if (facturaId) window.location.href = `/#/dashboard/factura/${facturaId}`;
        };
      }
    });
  }
}