import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface CrearCheckoutRequest {
  plan_id: number;
  success_url: string;
  cancel_url: string;
}

export interface CrearCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface VerificarPagoResponse {
  pagado: boolean;
  suscripcion_activa_hasta: string | null;
  mensaje: string;
}

export interface PlanInfo {
  plan: {
    id: number;
    nombre: string;
    descripcion: string;
    precio_mensual: number;
    precio_anual: number;
    limite_tecnicos: number;
    limite_incidentes_mensual: number;
    caracteristicas: any;
  } | null;
  suscripcion_activa: boolean;
  suscripcion_activa_hasta: string | null;
  limite_tecnicos: number;
  tecnicos_actuales: number;
  limite_incidentes_mensual: number;
  incidentes_mes_actual: number;
  puede_agregar_tecnico: boolean;
  puede_reportar_incidente: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SuscripcionService {
  private apiUrl = 'http://localhost:8000/api/v1/suscripcion';

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

  obtenerMiPlan(): Observable<PlanInfo> {
    return this.http.get<PlanInfo>(`${this.apiUrl}/mi-plan`, { headers: this.getHeaders() });
  }

  crearCheckout(planId: number, successUrl: string, cancelUrl: string): Observable<CrearCheckoutResponse> {
    const payload: CrearCheckoutRequest = {
      plan_id: planId,
      success_url: successUrl,
      cancel_url: cancelUrl
    };
    return this.http.post<CrearCheckoutResponse>(`${this.apiUrl}/crear-checkout`, payload, { headers: this.getHeaders() });
  }

  verificarPago(sessionId: string): Observable<VerificarPagoResponse> {
    return this.http.post<VerificarPagoResponse>(`${this.apiUrl}/verificar-pago`, { session_id: sessionId }, { headers: this.getHeaders() });
  }
}