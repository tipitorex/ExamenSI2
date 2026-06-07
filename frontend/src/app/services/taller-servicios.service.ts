import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface TallerServicioCrear {
  nombre: string;
  descripcion?: string;
  precio_base?: number;
  tiempo_estimado_minutos?: number;
}

export interface TallerServicio {
  id: number;
  taller_id: number;
  nombre: string;
  descripcion?: string;
  precio_base?: number;
  tiempo_estimado_minutos?: number;
}

@Injectable({ providedIn: 'root' })
export class TallerServiciosService {
  private apiUrl = 'http://localhost:8000/api/v1/taller-servicios';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  }

  listar(): Observable<TallerServicio[]> {
    return this.http.get<TallerServicio[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  crear(payload: TallerServicioCrear): Observable<TallerServicio> {
    return this.http.post<TallerServicio>(this.apiUrl, payload, { headers: this.getHeaders() });
  }

  actualizar(id: number, payload: Partial<TallerServicioCrear>): Observable<TallerServicio> {
    return this.http.put<TallerServicio>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
