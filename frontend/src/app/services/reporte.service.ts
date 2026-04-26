// src/app/services/reporte.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ResumenDashboard {
  totales: {
    incidentes: number;
    facturado: number;
    comisiones: number;
    neto_taller: number;
    pendiente_pago: number;
    pagado: number;
    tecnicos_activos: number;
  };
  incidentes_por_estado: Array<{ estado: string; cantidad: number }>;
}

export interface IngresosMensuales {
  labels: string[];
  datasets: {
    facturado: number[];
    comisiones: number[];
    neto: number[];
  };
}

export interface IncidentesPorClasificacion {
  datos: Array<{
    clasificacion: string;
    cantidad: number;
    color: string;
  }>;
  total: number;
}

export interface ServicioFacturado {
  id: number;
  numero_factura: string;
  fecha_factura: string;
  fecha_incidente: string | null;
  cliente_nombre: string;
  cliente_email: string;
  clasificacion_ia: string;
  descripcion: string;
  total: number;
  comision_plataforma: number;
  monto_neto_taller: number;
  estado: string;
  pagado_en: string | null;
}

export interface ServiciosFacturadosResponse {
  total: number;
  skip: number;
  limit: number;
  servicios: ServicioFacturado[];
}

export interface TopTecnico {
  id: number;
  nombre: string;
  especialidad: string;
  total_incidentes: number;
}

export interface TopTecnicosResponse {
  tecnicos: TopTecnico[];
  periodo_meses: number;
}

export interface Tendencias {
  incidentes: {
    actual: number;
    pasado: number;
    cambio_porcentaje: number;
  };
  ingresos: {
    actual: number;
    pasado: number;
    cambio_porcentaje: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  obtenerResumenDashboard(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(
      `${this.apiBaseUrl}/reportes/dashboard/resumen`,
      { headers: this.authService.obtenerHeadersAuth() }
    );
  }

  obtenerIngresosMensuales(meses: number = 6): Observable<IngresosMensuales> {
    const params = new HttpParams().set('meses', meses.toString());
    return this.http.get<IngresosMensuales>(
      `${this.apiBaseUrl}/reportes/ingresos-mensuales`,
      { headers: this.authService.obtenerHeadersAuth(), params }
    );
  }

  obtenerIncidentesPorClasificacion(
    fechaInicio?: string,
    fechaFin?: string
  ): Observable<IncidentesPorClasificacion> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get<IncidentesPorClasificacion>(
      `${this.apiBaseUrl}/reportes/incidentes-por-clasificacion`,
      { headers: this.authService.obtenerHeadersAuth(), params }
    );
  }

  obtenerServiciosFacturados(
    skip: number = 0,
    limit: number = 50,
    estadoFactura?: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Observable<ServiciosFacturadosResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    if (estadoFactura) params = params.set('estado_factura', estadoFactura);
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get<ServiciosFacturadosResponse>(
      `${this.apiBaseUrl}/reportes/servicios-facturados`,
      { headers: this.authService.obtenerHeadersAuth(), params }
    );
  }

  obtenerTopTecnicos(meses: number = 6): Observable<TopTecnicosResponse> {
    const params = new HttpParams().set('meses', meses.toString());
    return this.http.get<TopTecnicosResponse>(
      `${this.apiBaseUrl}/reportes/top-tecnicos`,
      { headers: this.authService.obtenerHeadersAuth(), params }
    );
  }

  obtenerTendencias(): Observable<Tendencias> {
    return this.http.get<Tendencias>(
      `${this.apiBaseUrl}/reportes/tendencias`,
      { headers: this.authService.obtenerHeadersAuth() }
    );
  }
}