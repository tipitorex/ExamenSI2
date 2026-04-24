import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Evidencia } from '../models/tipos';

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
  evidencias?: Evidencia[];
}

export interface IncidentePorFacturar {
  id: number;
  cliente_nombre: string;
  cliente_email: string;
  vehiculo: string;
  placa: string;
  clasificacion_ia: string;
  fecha_atencion: string;
}

export interface FacturaResponse {
  id: number;
  incidente_id: number;
  taller_id: number;
  cliente_id: number;
  numero_factura: string;
  total: number;
  comision_plataforma: number;
  monto_neto_taller: number;
  estado: string;
  url_pago: string | null;
  creado_en: string;
  pagado_en: string | null;
  conceptos?: ConceptoFactura[];
  cliente?: ClienteFactura;
  taller?: TallerFactura;
}

export interface ConceptoFactura {
  id: number;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ClienteFactura {
  nombre_completo: string;
  email: string;
  telefono: string;
}

export interface TallerFactura {
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncidenteService {
  private apiUrl = 'http://localhost:8000/api/v1/incidentes';
  private pagosUrl = 'http://localhost:8000/api/v1/pagos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerToken();
    console.log('🔑 Token:', token ? `${token.substring(0, 30)}...` : 'VACÍO');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ========== INCIDENTES ==========
  
  obtenerIncidente(id: number): Observable<IncidenteCompleto> {
    return this.http.get<IncidenteCompleto>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Listar incidentes atendidos SIN facturar
  listarIncidentesAtendidosSinFacturar(): Observable<IncidentePorFacturar[]> {
    return this.http.get<IncidentePorFacturar[]>(`${this.apiUrl}/atendidos/sin-facturar`, { headers: this.getHeaders() });
  }

  // ========== FACTURAS ==========

  // Listar todas las facturas del taller
  listarFacturasTaller(): Observable<FacturaResponse[]> {
    return this.http.get<FacturaResponse[]>(`${this.pagosUrl}/facturas/taller`, { headers: this.getHeaders() });
  }

  // Obtener factura por incidente
  obtenerFacturaPorIncidente(incidenteId: number): Observable<FacturaResponse> {
    return this.http.get<FacturaResponse>(`${this.pagosUrl}/facturas/incidente/${incidenteId}`, { headers: this.getHeaders() });
  }

  // Obtener detalle de factura (USANDO EL NUEVO ENDPOINT PARA TALLER)
  obtenerFacturaDetalle(facturaId: number): Observable<FacturaResponse> {
    console.log('📡 Llamando a:', `${this.pagosUrl}/facturas-taller/${facturaId}`);
    return this.http.get<FacturaResponse>(`${this.pagosUrl}/facturas-taller/${facturaId}`, { headers: this.getHeaders() });
  }

  // Crear factura
  crearFactura(payload: any): Observable<FacturaResponse> {
    return this.http.post<FacturaResponse>(`${this.pagosUrl}/facturas`, payload, { headers: this.getHeaders() });
  }
}