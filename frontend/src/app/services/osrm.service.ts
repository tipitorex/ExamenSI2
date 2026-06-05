import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  points: RoutePoint[];
  distance: number;  // km
  duration: number;  // minutos
}

@Injectable({
  providedIn: 'root'
})
export class OsrmService {
  private readonly OSRM_URL = 'https://router.project-osrm.org';

  constructor(private http: HttpClient) {}

  getRoute(startLat: number, startLng: number, endLat: number, endLng: number): Observable<RouteInfo> {
    const url = `${this.OSRM_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    console.log('🌍 [OSRM] Solicitando ruta:', url);
    console.log('🌍 [OSRM] Desde:', startLat, startLng, 'Hasta:', endLat, endLng);
    
    return this.http.get(url).pipe(
      map((response: any) => {
        console.log('📡 [OSRM] Respuesta código:', response.code);
        
        if (response.code === 'Ok' && response.routes && response.routes.length > 0) {
          const route = response.routes[0];
          const geometry = route.geometry.coordinates;
          
          const points: RoutePoint[] = geometry.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }));
          
          console.log(`✅ [OSRM] Ruta obtenida: ${points.length} puntos, ${(route.distance / 1000).toFixed(2)} km, ${(route.duration / 60).toFixed(0)} min`);
          
          return {
            points: points,
            distance: route.distance / 1000,
            duration: route.duration / 60
          };
        }
        
        console.warn('⚠️ [OSRM] No se obtuvo ruta, usando línea recta');
        return {
          points: [{ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng }],
          distance: this.calcularDistancia(startLat, startLng, endLat, endLng),
          duration: this.calcularDistancia(startLat, startLng, endLat, endLng) * 2
        };
      })
    );
  }

  private calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
}