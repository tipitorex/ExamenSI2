// src/app/services/mapa.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface IncidenteMapa {
  id: number;
  latitud: number;
  longitud: number;
  estado: string;
  cliente_nombre: string;
  cliente_telefono: string;
  descripcion: string;
  clasificacion: string;
  fecha_creacion: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class MapaService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  obtenerIncidentesActivos(): Observable<IncidenteMapa[]> {
    return this.http.get<IncidenteMapa[]>(
      `${this.apiBaseUrl}/mapas/incidentes-activos`,
      { headers: this.authService.obtenerHeadersAuth() }
    );
  }
}