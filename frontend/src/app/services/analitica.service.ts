// frontend/src/app/services/analitica.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface KPIAsignacion {
  tiempo_promedio_asignacion_minutos: number;
  tiempo_promedio_llegada_minutos: number;
  total_incidentes_periodo: number;
  incidentes_resueltos: number;
  porcentaje_resolucion: number;
}

export interface IncidentesPorTipo {
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

export interface EficienciaTaller {
  taller_id: number;
  nombre_taller: string;
  telefono: string;
  tiempo_promedio_respuesta_minutos: number;
  tiempo_promedio_finalizacion_minutos: number;
  incidentes_atendidos: number;
  calificacion_promedio: number | null;
  score_eficiencia: number;
}

// 👇 Nuevas interfaces
export interface ZonaCaliente {
  latitud: number;
  longitud: number;
  cantidad: number;
  ciudad?: string;
  tipo_incidente?: string;
}

export interface CasosCancelados {
  total_cancelados: number;
  porcentaje_cancelacion: number;
  motivos_cancelacion: { [key: string]: number };
  cancelados_por_estado: { [key: string]: number };
  tendencia_mensual: Array<{ mes: string; cantidad: number }>;
}

export interface CumplimientoSLA {
  nivel_cumplimiento_porcentaje: number;
  incidentes_dentro_sla: number;
  incidentes_fuera_sla: number;
  tiempo_promedio_respuesta_sla_minutos: number;
  tiempo_sla_esperado_minutos: number;
  distribucion_tiempos: Array<{ rango: string; cantidad: number; porcentaje: number }>;
}

export interface DashboardAnalitica {
  kpi_generales: KPIAsignacion;
  incidentes_por_tipo: IncidentesPorTipo[];
  talleres_top_eficientes: EficienciaTaller[];
  tendencia_incidentes: Array<{ fecha: string; cantidad: number }>;
  distribucion_geografica: Array<{ ciudad: string; cantidad: number }>;
  // 👇 Nuevos campos
  zonas_calientes: ZonaCaliente[];
  casos_cancelados: CasosCancelados;
  cumplimiento_sla: CumplimientoSLA;
}

@Injectable({
  providedIn: 'root'
})
export class AnaliticaService {
  private apiUrl = `${environment.apiUrl}/analitica`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getDashboardAnalitica(fechaInicio?: string, fechaFin?: string): Observable<DashboardAnalitica> {
    let params: any = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    
    return this.http.get<DashboardAnalitica>(`${this.apiUrl}/dashboard`, {
      params,
      headers: this.authService.obtenerHeadersAuth(),
    });
  }

  getRankingTalleres(limit: number = 10): Observable<EficienciaTaller[]> {
    return this.http.get<EficienciaTaller[]>(`${this.apiUrl}/talleres/ranking`, {
      params: { limit },
      headers: this.authService.obtenerHeadersAuth(),
    });
  }

  getKPIsTiempos(fechaInicio?: string, fechaFin?: string): Observable<KPIAsignacion> {
    let params: any = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    
    return this.http.get<KPIAsignacion>(`${this.apiUrl}/kpis/tiempos`, {
      params,
      headers: this.authService.obtenerHeadersAuth(),
    });
  }
}