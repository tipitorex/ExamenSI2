import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Subject } from 'rxjs';
import { UbicacionTecnicoData } from './websocket.service';
import { OsrmService, RouteInfo } from './osrm.service';

export interface RutaInfo {
  distancia: number;  // km
  duracion: number;   // minutos
}

@Injectable({
  providedIn: 'root'
})
export class MapaTrackingService {
  private map: L.Map | null = null;
  private tecnicoMarker: L.Marker | null = null;
  private incidenteMarker: L.Marker | null = null;
  private routePolyline: L.Polyline | null = null;
  private currentPosition: [number, number] | null = null;
  private centerOnTecnico: boolean = true;
  private incidenteLatLng: L.LatLng | null = null;
  
  private rutaActualizadaSubject = new Subject<RutaInfo>();
  public rutaActualizada$ = this.rutaActualizadaSubject.asObservable();

  constructor(private osrmService: OsrmService) {
    console.log('🗺️ MapaTrackingService inicializado con OSRM');
  }

  initMap(containerId: string, incidenteLat: number, incidenteLng: number): void {
    console.log('🗺️ initMap llamado', { incidenteLat, incidenteLng });
    
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.incidenteLatLng = L.latLng(incidenteLat, incidenteLng);
    const incidenteCoords: [number, number] = [incidenteLat, incidenteLng];

    this.map = L.map(containerId).setView(incidenteCoords, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 3
    }).addTo(this.map);

    const incidenteIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <div style="position: absolute; top: 3px; left: 6px; color: white; font-size: 10px;">⚠️</div>
            </div>`,
      iconSize: [22, 22],
      popupAnchor: [0, -11]
    });

    this.incidenteMarker = L.marker(incidenteCoords, { icon: incidenteIcon })
      .addTo(this.map)
      .bindPopup(`
        <div style="font-family: 'Inter', sans-serif;">
          <strong style="color: #ef4444;">📍 Incidente</strong><br>
          Lat: ${incidenteLat.toFixed(6)}<br>
          Lng: ${incidenteLng.toFixed(6)}
        </div>
      `)
      .openPopup();

    L.circle(incidenteCoords, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.1,
      radius: 100,
      weight: 1
    }).addTo(this.map);

    console.log('🗺️ Mapa inicializado correctamente');
  }

  async actualizarUbicacionTecnico(data: UbicacionTecnicoData): Promise<void> {
    console.log('📍 [MAP] actualizarUbicacionTecnico iniciado', data);
    
    if (!this.map || !this.incidenteLatLng) {
      console.warn('⚠️ Mapa no inicializado');
      return;
    }

    const nuevaPosicion: [number, number] = [data.latitud, data.longitud];
    this.currentPosition = nuevaPosicion;

    const tecnicoIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <div style="position: absolute; top: 4px; left: 8px; color: white; font-size: 14px;">🚐</div>
            </div>`,
      iconSize: [28, 28],
      popupAnchor: [0, -14]
    });

    if (this.tecnicoMarker) {
      this.tecnicoMarker.setLatLng(nuevaPosicion);
    } else {
      this.tecnicoMarker = L.marker(nuevaPosicion, { icon: tecnicoIcon })
        .addTo(this.map);
    }

    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'ahora';
    this.tecnicoMarker?.setPopupContent(`
      <div style="font-family: 'Inter', sans-serif;">
        <strong style="color: #3b82f6;">👨‍🔧 ${data.tecnico_nombre}</strong><br>
        Estado: En camino<br>
        Última actualización: ${timestamp}
      </div>
    `);

    if (!this.tecnicoMarker?.isPopupOpen()) {
      this.tecnicoMarker?.openPopup();
    }

    console.log('🗺️ [MAP] Llamando a dibujarRutaReal...');
    await this.dibujarRutaReal(nuevaPosicion[0], nuevaPosicion[1]);

    if (this.centerOnTecnico) {
      this.map.setView(nuevaPosicion, 15);
    }

    console.log(`🚐 Técnico actualizado: ${data.latitud}, ${data.longitud}`);
  }

  private async dibujarRutaReal(tecnicoLat: number, tecnicoLng: number): Promise<void> {
    console.log('🗺️ [OSRM] dibujarRutaReal iniciada');
    console.log('🗺️ [OSRM] Técnico:', tecnicoLat, tecnicoLng);
    console.log('🗺️ [OSRM] Incidente:', this.incidenteLatLng?.lat, this.incidenteLatLng?.lng);
    
    if (!this.map || !this.incidenteLatLng) {
      console.warn('⚠️ [OSRM] Mapa o incidente no disponible');
      return;
    }

    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }

    console.log('🗺️ [OSRM] Llamando a OsrmService.getRoute...');
    
    this.osrmService.getRoute(tecnicoLat, tecnicoLng, this.incidenteLatLng.lat, this.incidenteLatLng.lng)
      .subscribe({
        next: (routeInfo: RouteInfo) => {
          console.log('✅ [OSRM] Ruta recibida:', routeInfo.points.length, 'puntos');
          console.log('✅ [OSRM] Distancia:', routeInfo.distance, 'km');
          console.log('✅ [OSRM] Duración:', routeInfo.duration, 'min');
          
          const points = routeInfo.points.map(p => [p.lat, p.lng]);
          
          this.routePolyline = L.polyline(points as any, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map!);
          
          if (points.length > 0) {
            const bounds = L.latLngBounds(points as any);
            this.map!.fitBounds(bounds, { padding: [50, 50] });
            console.log('✅ [OSRM] Ruta dibujada en el mapa');
          }
          
          // ✅ NOTIFICAR AL COMPONENTE CON LA DISTANCIA Y TIEMPO REALES
          this.rutaActualizadaSubject.next({
            distancia: routeInfo.distance,
            duracion: routeInfo.duration
          });
        },
        error: (error) => {
          console.error('❌ [OSRM] Error obteniendo ruta:', error);
          console.log('🗺️ [OSRM] Usando fallback de línea recta');
          this.dibujarLineaRecta(tecnicoLat, tecnicoLng);
        }
      });
  }

  private dibujarLineaRecta(tecnicoLat: number, tecnicoLng: number): void {
    console.log('🗺️ [FALLBACK] dibujarLineaRecta');
    if (!this.map || !this.incidenteLatLng) return;
    
    this.routePolyline = L.polyline(
      [[tecnicoLat, tecnicoLng], [this.incidenteLatLng.lat, this.incidenteLatLng.lng]],
      {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8',
        lineCap: 'round'
      }
    ).addTo(this.map);

    const bounds = L.latLngBounds(
      [tecnicoLat, tecnicoLng],
      [this.incidenteLatLng.lat, this.incidenteLatLng.lng]
    );
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  getDistanciaActual(): number | null {
    if (!this.currentPosition || !this.incidenteLatLng) return null;
    return this.calcularDistancia(
      this.currentPosition[0],
      this.currentPosition[1],
      this.incidenteLatLng.lat,
      this.incidenteLatLng.lng
    );
  }

  setCenterOnTecnico(enabled: boolean): void {
    this.centerOnTecnico = enabled;
  }

  centerOnTecnicoNow(): void {
    if (this.map && this.currentPosition) {
      this.map.setView(this.currentPosition, 15);
    }
  }

  centerOnIncidenteNow(): void {
    if (this.map && this.incidenteLatLng) {
      this.map.setView([this.incidenteLatLng.lat, this.incidenteLatLng.lng], 14);
    }
  }

  destroyMap(): void {
    console.log('🗺️ destroyMap llamado');
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.tecnicoMarker = null;
    this.incidenteMarker = null;
    this.currentPosition = null;
    this.incidenteLatLng = null;
    console.log('🗺️ Mapa destruido');
  }

  isMapInitialized(): boolean {
    return this.map !== null;
  }

  hasTecnico(): boolean {
    return this.tecnicoMarker !== null;
  }
}