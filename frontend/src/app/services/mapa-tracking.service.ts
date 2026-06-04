import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { UbicacionTecnicoData } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class MapaTrackingService {
  private map: L.Map | null = null;
  private tecnicoMarker: L.Marker | null = null;
  private incidenteMarker: L.Marker | null = null;
  private routePolyline: L.Polyline | null = null;
  private currentPosition: [number, number] | null = null;
  private centerOnTecnico: boolean = true; // Auto-centrar en técnico

  /**
   * Inicializar mapa en un contenedor
   * @param containerId ID del elemento contenedor del mapa
   * @param incidenteLat Latitud del incidente
   * @param incidenteLng Longitud del incidente
   */
  initMap(
    containerId: string,
    incidenteLat: number,
    incidenteLng: number
  ): void {
    // Destruir mapa existente si hay
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const incidenteCoords: [number, number] = [incidenteLat, incidenteLng];

    // Crear mapa centrado en el incidente
    this.map = L.map(containerId).setView(incidenteCoords, 14);

    // Capa de mapa (OpenStreetMap gratis)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 3
    }).addTo(this.map);

    // Icono personalizado para incidente (rojo)
    const incidenteIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <div style="position: absolute; top: 3px; left: 6px; color: white; font-size: 10px;">⚠️</div>
            </div>`,
      iconSize: [22, 22],
      popupAnchor: [0, -11]
    });

    // Agregar marcador del incidente
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

    // Opcional: agregar un círculo de radio alrededor del incidente (100m)
    L.circle(incidenteCoords, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.1,
      radius: 100,
      weight: 1
    }).addTo(this.map);

    console.log('🗺️ Mapa inicializado');
  }

  /**
   * Actualizar ubicación del técnico en el mapa
   * @param data Datos de ubicación del técnico
   */
  actualizarUbicacionTecnico(data: UbicacionTecnicoData): void {
    if (!this.map) {
      console.warn('⚠️ Mapa no inicializado');
      return;
    }

    const nuevaPosicion: [number, number] = [data.latitud, data.longitud];
    this.currentPosition = nuevaPosicion;

    // Icono personalizado para técnico (azul con icono de camioneta)
    const tecnicoIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <div style="position: absolute; top: 4px; left: 8px; color: white; font-size: 14px;">🚐</div>
            </div>`,
      iconSize: [28, 28],
      popupAnchor: [0, -14]
    });

    // Actualizar o crear marcador del técnico
    if (this.tecnicoMarker) {
      this.tecnicoMarker.setLatLng(nuevaPosicion);
    } else {
      this.tecnicoMarker = L.marker(nuevaPosicion, { icon: tecnicoIcon })
        .addTo(this.map);
    }

    // Actualizar popup del técnico
    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'ahora';
    this.tecnicoMarker?.setPopupContent(`
      <div style="font-family: 'Inter', sans-serif;">
        <strong style="color: #3b82f6;">👨‍🔧 ${data.tecnico_nombre}</strong><br>
        Estado: En camino<br>
        Última actualización: ${timestamp}
      </div>
    `);

    // Abrir popup automáticamente si es la primera vez
    if (!this.tecnicoMarker?.isPopupOpen()) {
      this.tecnicoMarker?.openPopup();
    }

    // Trazar ruta entre técnico e incidente
    this.trazarRuta();

    // Centrar el mapa en el técnico si está habilitado
    if (this.centerOnTecnico && this.incidenteMarker) {
      this.map.setView(nuevaPosicion, 15);
    }

    console.log(`🚐 Técnico actualizado: ${data.latitud}, ${data.longitud}`);
  }

  /**
   * Trazar ruta visual entre técnico e incidente
   */
  private trazarRuta(): void {
    if (!this.map || !this.currentPosition || !this.incidenteMarker) return;

    const incidentePos = this.incidenteMarker.getLatLng();
    const tecnicoPos = L.latLng(this.currentPosition[0], this.currentPosition[1]);

    // Eliminar ruta anterior si existe
    if (this.routePolyline) {
      this.routePolyline.remove();
    }

    // Crear nueva línea de ruta
    this.routePolyline = L.polyline([tecnicoPos, incidentePos], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(this.map);

    // Ajustar el mapa para mostrar toda la ruta
    const bounds = L.latLngBounds([tecnicoPos, incidentePos]);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * Calcular distancia entre dos puntos en kilómetros
   * @param lat1 Latitud punto 1
   * @param lng1 Longitud punto 1
   * @param lat2 Latitud punto 2
   * @param lng2 Longitud punto 2
   * @returns Distancia en km
   */
  calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convertir grados a radianes
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Obtener distancia actual entre técnico e incidente
   * @returns Distancia en km o null si no hay posiciones
   */
  getDistanciaActual(): number | null {
    if (!this.currentPosition || !this.incidenteMarker) return null;
    const incidentePos = this.incidenteMarker.getLatLng();
    return this.calcularDistancia(
      this.currentPosition[0],
      this.currentPosition[1],
      incidentePos.lat,
      incidentePos.lng
    );
  }

  /**
   * Habilitar/deshabilitar auto-centrado en técnico
   */
  setCenterOnTecnico(enabled: boolean): void {
    this.centerOnTecnico = enabled;
  }

  /**
   * Centrar el mapa en el técnico manualmente
   */
  centerOnTecnicoNow(): void {
    if (this.map && this.currentPosition) {
      this.map.setView(this.currentPosition, 15);
    }
  }

  /**
   * Centrar el mapa en el incidente manualmente
   */
  centerOnIncidenteNow(): void {
    if (this.map && this.incidenteMarker) {
      const incidentePos = this.incidenteMarker.getLatLng();
      this.map.setView([incidentePos.lat, incidentePos.lng], 14);
    }
  }

  /**
   * Destruir mapa y limpiar recursos
   */
  destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.tecnicoMarker = null;
    this.incidenteMarker = null;
    this.routePolyline = null;
    this.currentPosition = null;
    console.log('🗺️ Mapa destruido');
  }

  /**
   * Verificar si el mapa está inicializado
   */
  isMapInitialized(): boolean {
    return this.map !== null;
  }

  /**
   * Verificar si hay técnico en el mapa
   */
  hasTecnico(): boolean {
    return this.tecnicoMarker !== null;
  }
}