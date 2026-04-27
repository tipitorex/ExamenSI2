import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapaService, IncidenteMapa } from '../../services/mapa.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-dashboard-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-mapa.component.html',
  styleUrls: ['./dashboard-mapa.component.scss']
})
export class DashboardMapaComponent implements OnInit, AfterViewInit, OnDestroy {
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  incidentes: IncidenteMapa[] = [];
  private subscription?: Subscription;
  private pollingSubscription?: Subscription;

  constructor(private mapaService: MapaService) {}

  ngOnInit(): void {
    this.cargarIncidentes();
    this.iniciarPolling();
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
    this.subscription?.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  iniciarPolling(): void {
    // Actualizar cada 30 segundos
    this.pollingSubscription = interval(30000).subscribe(() => {
      this.cargarIncidentes();
    });
  }

  cargarIncidentes(): void {
    this.subscription = this.mapaService.obtenerIncidentesActivos().subscribe({
      next: (data) => {
        this.incidentes = data;
        this.actualizarMarcadores();
      },
      error: (error) => {
        console.error('Error cargando incidentes:', error);
      }
    });
  }

  inicializarMapa(): void {
    this.map = L.map('mapa').setView([-34.6037, -58.3816], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  actualizarMarcadores(): void {
    // Limpiar marcadores existentes
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Agregar nuevos marcadores
    this.incidentes.forEach(incidente => {
      const icon = this.crearIcono(incidente.estado, incidente.color);
      
      const marker = L.marker([incidente.latitud, incidente.longitud], { icon })
        .addTo(this.map!)
        .bindPopup(this.crearPopup(incidente));
      
      this.markers.push(marker);
    });

    // Ajustar el mapa para mostrar todos los marcadores si hay incidentes
    if (this.markers.length > 0 && this.map) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  crearIcono(estado: string, color: string): L.DivIcon {
    const iconoTexto = estado === 'pendiente' ? '⚠️' : '🔧';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;">${iconoTexto}</div>`,
      iconSize: [40, 40],
      popupAnchor: [0, -20]
    });
  }

  crearPopup(incidente: IncidenteMapa): string {
    const estadoTexto = incidente.estado === 'pendiente' ? '⏳ Pendiente' : '🔄 En proceso';
    const fecha = new Date(incidente.fecha_creacion).toLocaleString();
    
    return `
      <div style="padding: 8px; min-width: 220px;">
        <h4 style="margin: 0 0 8px 0; font-weight: bold;">🚨 Incidente #${incidente.id}</h4>
        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${incidente.cliente_nombre}</p>
        <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${incidente.cliente_telefono}</p>
        <p style="margin: 4px 0;"><strong>Tipo:</strong> ${incidente.clasificacion}</p>
        <p style="margin: 4px 0;"><strong>Estado:</strong> ${estadoTexto}</p>
        <p style="margin: 4px 0;"><strong>Fecha:</strong> ${fecha}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">${incidente.descripcion}</p>
      </div>
    `;
  }

  centrarEnIncidente(incidente: IncidenteMapa): void {
    if (this.map) {
      this.map.setView([incidente.latitud, incidente.longitud], 15);
    }
  }
}