import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TecnicoActualizarPayload, TecnicoCrearPayload, TecnicoRespuesta } from '../models/tipos';
import { AuthService } from './auth.service';

export interface TecnicoDisponible {
  id: number;
  nombre_completo: string;
  telefono: string | null;
  especialidad: string | null;
  distancia_km: number | null;
  tiempo_estimado_minutos: number | null;
  score_recomendacion: number;
  disponible: boolean;
}

export interface TecnicosDisponiblesResponse {
  tecnicos: TecnicoDisponible[];
  recomendado_id: number | null;
  total_tecnicos: number;
}

@Injectable({
  providedIn: 'root',
})
export class TecnicoService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';

  private tecnicosSubject = new BehaviorSubject<TecnicoRespuesta[]>([]);
  public tecnicos$ = this.tecnicosSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  obtenerTecnicos(): Observable<TecnicoRespuesta[]> {
    return this.http
      .get<TecnicoRespuesta[]>(`${this.apiBaseUrl}/tecnicos`, {
        headers: this.authService.obtenerHeadersAuth(),
      })
      .pipe(
        tap((data: TecnicoRespuesta[]) => {
          this.tecnicosSubject.next(data);
        }),
      );
  }

  crearTecnico(nombre_completo: string, telefono?: string, especialidad?: string): Observable<TecnicoRespuesta> {
    const payload: TecnicoCrearPayload = {
      nombre_completo: nombre_completo.trim(),
      telefono: telefono?.trim() || null,
      especialidad: especialidad?.trim() || null,
    };

    return this.http
      .post<TecnicoRespuesta>(`${this.apiBaseUrl}/tecnicos`, payload, {
        headers: this.authService.obtenerHeadersAuth(),
      })
      .pipe(
        tap((nuevoTecnico: TecnicoRespuesta) => {
          const tecnicos = this.tecnicosSubject.value;
          this.tecnicosSubject.next([...tecnicos, nuevoTecnico]);
        }),
      );
  }

  actualizarTecnico(tecnicoId: number, payload: TecnicoActualizarPayload): Observable<TecnicoRespuesta> {
    return this.http
      .put<TecnicoRespuesta>(`${this.apiBaseUrl}/tecnicos/${tecnicoId}`, payload, {
        headers: this.authService.obtenerHeadersAuth(),
      })
      .pipe(
        tap((actualizado: TecnicoRespuesta) => {
          const tecnicos = this.tecnicosSubject.value;
          this.tecnicosSubject.next(tecnicos.map((t: TecnicoRespuesta) => (t.id === actualizado.id ? actualizado : t)));
        }),
      );
  }

  cambiarDisponibilidad(tecnicoId: number, disponible: boolean): Observable<TecnicoRespuesta> {
    const payload = { disponible };
    return this.http
      .patch<TecnicoRespuesta>(
        `${this.apiBaseUrl}/tecnicos/${tecnicoId}/disponibilidad`,
        payload,
        { headers: this.authService.obtenerHeadersAuth() },
      )
      .pipe(
        tap((actualizado: TecnicoRespuesta) => {
          const tecnicos = this.tecnicosSubject.value;
          this.tecnicosSubject.next(
            tecnicos.map((t: TecnicoRespuesta) => (t.id === actualizado.id ? actualizado : t)),
          );
        }),
      );
  }

  eliminarTecnico(tecnicoId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/tecnicos/${tecnicoId}`, {
        headers: this.authService.obtenerHeadersAuth(),
      })
      .pipe(
        tap(() => {
          const tecnicos = this.tecnicosSubject.value;
          this.tecnicosSubject.next(tecnicos.filter((t: TecnicoRespuesta) => t.id !== tecnicoId));
        }),
      );
  }

  obtenerTecnicosActuales(): TecnicoRespuesta[] {
    return this.tecnicosSubject.value;
  }

  cantidadDisponibles(): number {
    return this.tecnicosSubject.value.filter((t: TecnicoRespuesta) => t.disponible && t.activo).length;
  }

  // ============================================================
  // NUEVO MÉTODO - Obtener técnicos disponibles con distancia y recomendación IA
  // ============================================================
  getTecnicosDisponiblesCercanos(
    incidenteLat: number,
    incidenteLng: number,
    clasificacionIa?: string | null
  ): Observable<TecnicosDisponiblesResponse> {
    let params = new HttpParams()
      .set('incidente_lat', incidenteLat.toString())
      .set('incidente_lng', incidenteLng.toString());

    if (clasificacionIa) {
      params = params.set('clasificacion_ia', clasificacionIa);
    }

    return this.http.get<TecnicosDisponiblesResponse>(
      `${this.apiBaseUrl}/tecnicos/disponibles-cercanos`,
      {
        headers: this.authService.obtenerHeadersAuth(),
        params,
      }
    );
  }
}