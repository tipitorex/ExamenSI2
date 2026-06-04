import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WebSocketMessage {
  tipo: 'estado_incidente' | 'ubicacion_tecnico' | 'conexion_establecida' | 'pong';
  data: any;
}

export interface EstadoIncidenteData {
  incidente_id: number;
  estado: string;
  tecnico_nombre?: string;
  tecnico_telefono?: string;
  tiempo_estimado?: number;
  taller_nombre?: string;
}

export interface UbicacionTecnicoData {
  incidente_id: number;
  tecnico_id: number;
  tecnico_nombre: string;
  latitud: number;
  longitud: number;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private ws: WebSocket | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private messagesSubject = new BehaviorSubject<WebSocketMessage | null>(null);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: any = null;
  private currentIncidenteId: number | null = null;
  private isConnecting: boolean = false;
  
  public connected$ = this.connectedSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();

  constructor(
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  connect(incidenteId?: number): void {
    // Si ya está conectado al mismo incidente, no hacer nada
    if (this.isConnected() && this.currentIncidenteId === incidenteId) {
      console.log('🔌 WebSocket ya conectado al incidente', incidenteId);
      return;
    }
    
    // Si ya se está conectando, evitar duplicados
    if (this.isConnecting) {
      console.log('⏳ WebSocket ya conectando, esperando...');
      return;
    }
    
    const token = this.authService.obtenerToken();
    if (!token) {
      console.error('❌ No hay token de autenticación');
      return;
    }

    // Solo desconectar si hay una conexión activa y diferente
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.disconnect();
    }
    
    this.isConnecting = true;
    this.currentIncidenteId = incidenteId || null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = 'localhost:8000';
    let wsUrl = `${protocol}//${wsHost}/api/v1/ws?token=${token}`;
    
    if (incidenteId) {
      wsUrl += `&incidente_id=${incidenteId}`;
    }

    const tallerId = localStorage.getItem('taller_id');
    if (tallerId) {
      wsUrl += `&taller_id=${tallerId}`;
    }

    console.log('🔌 Conectando a WebSocket, incidente:', incidenteId);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      this.isConnecting = false;
      this.ngZone.run(() => {
        this.connectedSubject.next(true);
        this.reconnectAttempts = 0;
      });
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Mensaje WebSocket recibido:', data.tipo);
        this.ngZone.run(() => {
          this.messagesSubject.next(data);
        });
      } catch (error) {
        console.error('❌ Error parseando mensaje:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
      this.isConnecting = false;
      this.ngZone.run(() => {
        this.connectedSubject.next(false);
      });
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket desconectado:', event.code);
      this.isConnecting = false;
      this.ngZone.run(() => {
        this.connectedSubject.next(false);
      });
      this.stopPing();
      // Solo reconectar si no fue un cierre manual
      if (event.code !== 1000) {
        this.reconnect(this.currentIncidenteId || undefined);
      }
    };
  }

  private reconnect(incidenteId?: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Máximos intentos de reconexión alcanzados');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect(incidenteId);
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ tipo: 'ping' }));
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  sendUbicacion(incidenteId: number, latitud: number, longitud: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket no conectado');
      return;
    }

    const message = {
      tipo: 'actualizar_ubicacion',
      data: {
        incidente_id: incidenteId,
        latitud: latitud,
        longitud: longitud
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log('📍 Ubicación enviada:', latitud, longitud);
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      // Código 1000 = cierre normal
      this.ws.close(1000, 'Cierre manual');
      this.ws = null;
    }
    this.currentIncidenteId = null;
    this.isConnecting = false;
    this.connectedSubject.next(false);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$;
  }

  getMessages(): Observable<WebSocketMessage | null> {
    return this.messages$;
  }
}