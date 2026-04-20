
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface VehiculoInfo {
  id: number;
  marca: string;
  modelo: string;
  placa: string;
  anio?: number;
  color?: string;
}

export interface ClienteInfo {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  creado_en: string;
}

export interface IncidenteCompleto {
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
  vehiculo?: VehiculoInfo;
  cliente?: ClienteInfo;
}

@Injectable({
  providedIn: 'root'
})
export class IncidenteService {
  private apiUrl = 'http://localhost:8000/api/v1/incidentes';

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

  obtenerIncidente(id: number): Observable<IncidenteCompleto> {
    return this.http.get<IncidenteCompleto>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}