import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ItemServicio {
  nombre: string;
  precio: number;
}

export interface CotizacionCrear {
  incidente_id: number;
  items: ItemServicio[];
  tiempo_estimado_reparacion_horas: number;
  notas?: string;
}

export interface TallerResumen {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}

export interface Cotizacion {
  id: number;
  incidente_id: number;
  taller_id: number;
  monto_total: number;
  tiempo_estimado_reparacion_horas?: number;
  items?: ItemServicio[];
  notas?: string;
  estado: string;
  creado_en: string;
  taller?: TallerResumen;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private apiUrl = 'http://localhost:8000/api/v1/cotizaciones';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  }

  enviarCotizacion(payload: CotizacionCrear): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(this.apiUrl, payload, { headers: this.getHeaders() });
  }

  misCotizaciones(): Observable<Cotizacion[]> {
    return this.http.get<Cotizacion[]>(`${this.apiUrl}/mis-cotizaciones`, { headers: this.getHeaders() });
  }
}
