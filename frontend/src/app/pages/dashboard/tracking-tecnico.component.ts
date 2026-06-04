import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Servicios
import { WebsocketService, UbicacionTecnicoData, EstadoIncidenteData } from '../../services/websocket.service';
import { MapaTrackingService } from '../../services/mapa-tracking.service';
import { IncidenteService, IncidenteCompleto } from '../../services/incidente.service';

@Component({
  selector: 'app-tracking-tecnico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking-tecnico.component.html',
  styleUrls: ['./tracking-tecnico.component.scss']
})
export class TrackingTecnicoComponent implements OnInit, AfterViewInit, OnDestroy {
  
  incidenteId: number | null = null;
  incidente: IncidenteCompleto | null = null;
  cargando: boolean = true;
  
  // Estado del tracking
  estadoActual: string = '';
  estadoTexto: string = '';
  estadoColor: string = '';
  tecnicoNombre: string = '';
  tecnicoTelefono: string = '';
  tiempoEstimado: number | null = null;
  distanciaActual: number | null = null;
  conectado: boolean = false;
  centerOnTecnico: boolean = true;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private websocketService: WebsocketService,
    private mapaTrackingService: MapaTrackingService,
    private incidenteService: IncidenteService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.incidenteId = +params['id'];
      if (this.incidenteId) {
        this.cargarIncidente();
        this.conectarWebSocket();
      } else {
        this.cargando = false;
      }
    });

    this.subscriptions.push(
      this.websocketService.messages$.subscribe(message => {
        if (message) this.procesarMensaje(message);
      })
    );

    this.subscriptions.push(
      this.websocketService.connected$.subscribe(connected => {
        this.conectado = connected;
      })
    );
  }

  ngAfterViewInit(): void {}

  cargarIncidente(): void {
    if (!this.incidenteId) return;

    this.incidenteService.obtenerIncidente(this.incidenteId).subscribe({
      next: (data) => {
        this.incidente = data;
        this.estadoActual = data.estado;
        this.actualizarEstadoTexto(data.estado);
        this.cargando = false;

        setTimeout(() => {
          this.mapaTrackingService.initMap('tracking-map', data.latitud, data.longitud);
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.cargando = false;
      }
    });
  }

  conectarWebSocket(): void {
    if (this.incidenteId) {
      this.websocketService.connect(this.incidenteId);
    }
  }

  procesarMensaje(message: any): void {
    switch (message.tipo) {
      case 'estado_incidente':
        this.estadoActual = message.data.estado;
        this.tecnicoNombre = message.data.tecnico_nombre || this.tecnicoNombre;
        this.tecnicoTelefono = message.data.tecnico_telefono || this.tecnicoTelefono;
        this.tiempoEstimado = message.data.tiempo_estimado || this.tiempoEstimado;
        this.actualizarEstadoTexto(message.data.estado);
        break;

      case 'ubicacion_tecnico':
        this.tecnicoNombre = message.data.tecnico_nombre;
        this.mapaTrackingService.actualizarUbicacionTecnico(message.data);
        if (this.incidente) {
          this.distanciaActual = this.mapaTrackingService.calcularDistancia(
            message.data.latitud, message.data.longitud,
            this.incidente.latitud, this.incidente.longitud
          );
        }
        break;
    }
  }

  actualizarEstadoTexto(estado: string): void {
    const estados: Record<string, { texto: string; color: string }> = {
      'pendiente': { texto: '🟡 Pendiente', color: '#d97706' },
      'taller_asignado': { texto: '🔵 Taller asignado', color: '#2563eb' },
      'en_proceso': { texto: '🚐 Técnico en camino', color: '#16a34a' },
      'en_camino': { texto: '🚐 En camino', color: '#16a34a' },
      'atencion': { texto: '🔧 En atención', color: '#d97706' },
      'atendido': { texto: '✅ Finalizado', color: '#16a34a' },
      'finalizado': { texto: '✅ Finalizado', color: '#16a34a' },
      'cancelado': { texto: '❌ Cancelado', color: '#dc2626' }
    };
    const info = estados[estado] || { texto: estado, color: '#6b7280' };
    this.estadoTexto = info.texto;
    this.estadoColor = info.color;
  }

  toggleCenterOnTecnico(): void {
    this.centerOnTecnico = !this.centerOnTecnico;
    this.mapaTrackingService.setCenterOnTecnico(this.centerOnTecnico);
  }

  centrarEnTecnico(): void {
    this.mapaTrackingService.centerOnTecnicoNow();
  }

  centrarEnIncidente(): void {
    this.mapaTrackingService.centerOnIncidenteNow();
  }

  volver(): void {
    this.router.navigate(['/dashboard/emergencias-activas']);
  }

  formatDistancia(distancia: number | null): string {
    if (distancia === null) return 'Calculando...';
    if (distancia < 1) return `${Math.round(distancia * 1000)} m`;
    return `${distancia.toFixed(1)} km`;
  }

  ngOnDestroy(): void {
    this.websocketService.disconnect();
    this.mapaTrackingService.destroyMap();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}