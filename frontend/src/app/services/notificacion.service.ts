// src/app/services/notificacion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';

// Tipos de notificación (deben coincidir con el backend)
export type TipoNotificacion = 
  | 'nueva_solicitud'
  | 'asignacion_taller'
  | 'actualizacion_estado'
  | 'taller_acepto'
  | 'taller_rechazo'
  | 'tecnico_en_camino';

// Interfaz de notificación (respuesta del backend)
export interface NotificacionRespuesta {
  id: number;
  cliente_id: number | null;
  taller_id: number | null;
  incidente_id: number | null;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leido: boolean;
  fecha_envio: string;
  datos_extra_json: string | null;
}

// Payload para marcar como leída
export interface MarcarLeidaPayload {
  leido: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private readonly apiUrl = 'http://localhost:8000/api/v1/notificaciones';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtener todas las notificaciones del taller actual
   */
  obtenerNotificaciones(): Observable<NotificacionRespuesta[]> {
    return this.http.get<NotificacionRespuesta[]>(`${this.apiUrl}/taller`, {
      headers: this.authService.obtenerHeadersAuth()
    });
  }

  /**
   * Obtener una notificación específica por ID
   */
  obtenerNotificacion(id: number): Observable<NotificacionRespuesta> {
    return this.http.get<NotificacionRespuesta>(`${this.apiUrl}/${id}`, {
      headers: this.authService.obtenerHeadersAuth()
    });
  }

  /**
   * Marcar una notificación como leída o no leída
   * @param id ID de la notificación
   * @param leido true = leída, false = no leída
   */
  marcarLeida(id: number, leido: boolean): Observable<NotificacionRespuesta> {
    const payload: MarcarLeidaPayload = { leido };
    return this.http.put<NotificacionRespuesta>(`${this.apiUrl}/${id}/marcar-leida`, payload, {
      headers: this.authService.obtenerHeadersAuth()
    });
  }

  /**
   * Marcar múltiples notificaciones como leídas
   * @param ids Lista de IDs de notificaciones
   */
  marcarMultiplesComoLeidas(ids: number[]): Observable<NotificacionRespuesta[]> {
    // Crear un array de observables para cada petición
    const peticiones: Observable<NotificacionRespuesta>[] = ids.map(id => this.marcarLeida(id, true));
    
    // Usar forkJoin para ejecutar todas en paralelo
    return forkJoin(peticiones);
  }

  /**
   * Eliminar una notificación
   * @param id ID de la notificación
   */
  eliminarNotificacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.authService.obtenerHeadersAuth()
    });
  }
}