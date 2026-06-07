import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ResenaRespuesta {
  id: number;
  incidente_id: number;
  cliente_id: number;
  taller_id: number;
  tecnico_id: number | null;
  puntuacion_taller: number;
  puntuacion_tecnico: number | null;
  comentario: string | null;
  creado_en: string;
  taller_nombre: string | null;
  tecnico_nombre: string | null;
  cliente_nombre: string | null;
}

export interface RankingTallerItem {
  taller_id: number;
  taller_nombre: string;
  promedio_puntuacion: number;
  total_resenas: number;
  promedio_tecnico: number | null;
}

@Injectable({ providedIn: 'root' })
export class ResenasService {
  private base = 'http://localhost:8000/api/v1/resenas';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getRanking(): Observable<RankingTallerItem[]> {
    return this.http.get<RankingTallerItem[]>(`${this.base}/ranking-talleres`, { headers: this.getHeaders() });
  }

  getTodas(): Observable<ResenaRespuesta[]> {
    return this.http.get<ResenaRespuesta[]>(`${this.base}/todas`, { headers: this.getHeaders() });
  }
}
