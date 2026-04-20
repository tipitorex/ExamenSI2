import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

// Interfaz para el vehículo
export interface VehiculoInfo {
  id: number;
  marca: string;
  modelo: string;
  placa: string;
  anio?: number;
  color?: string;
}

// Interfaz para el cliente
export interface ClienteInfo {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  creado_en: string;
}

// Interfaz completa del incidente con datos anidados
export interface IncidenteDetalle {
  id: number;
  cliente_id: number;
  vehiculo_id: number;
  latitud: number;
  longitud: number;
  descripcion: string;
  resumen_ia: string | null;
  clasificacion_ia: string | null;
  prioridad: string;
  estado: string;
  direccion_texto: string | null;
  creado_en: string;
  actualizado_en?: string;
  // Datos anidados (vienen del backend si haces join)
  vehiculo?: VehiculoInfo;
  cliente?: ClienteInfo;
}

export interface AsignacionTaller {
  id: number;
  incidente_id: number;
  taller_id: number;
  tecnico_id: number | null;
  tiempo_estimado_llegada_minutos: number | null;
  distancia_km: number | null;
  fecha_asignacion: string;
  creado_en: string;  // Asegúrate que esto exista
  actualizado_en?: string;
  es_aceptado: boolean;
  motivo_rechazo: string | null;
  incidente?: IncidenteDetalle;
}

export interface AceptarRechazarPayload {
  es_aceptado: boolean;
  motivo_rechazo?: string;
}

export interface ActualizarEstadoPayload {
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsignacionService {
  // Asegúrate que la URL coincida con tu backend
  private apiUrl = 'http://localhost:8000/api/v1/asignaciones';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  listarAsignaciones(): Observable<AsignacionTaller[]> {
    return this.http.get<AsignacionTaller[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  obtenerAsignacion(id: number): Observable<AsignacionTaller> {
    return this.http.get<AsignacionTaller>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  aceptarRechazar(id: number, payload: AceptarRechazarPayload): Observable<AsignacionTaller> {
    return this.http.post<AsignacionTaller>(`${this.apiUrl}/${id}/aceptar-rechazar`, payload, { headers: this.getHeaders() });
  }

  actualizarEstadoIncidente(asignacionId: number, payload: ActualizarEstadoPayload): Observable<IncidenteDetalle> {
    return this.http.patch<IncidenteDetalle>(`${this.apiUrl}/${asignacionId}/estado-incidente`, payload, { headers: this.getHeaders() });
  }
}