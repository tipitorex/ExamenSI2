import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SuperAdminUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  creado_en: string;
}

export interface SuperAdminLoginResponse {
  token_acceso: string;
  tipo_token: string;
  usuario: SuperAdminUsuario;
}

export interface TenantAdmin {
  id: number;
  nombre: string;
  slug: string;
  schema_name: string;
  estado: 'activo' | 'suspendido' | 'inactivo';
  activo: boolean;
  plan_actual: 'free' | 'pro' | null;
  creado_en: string;
}

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';
  private readonly tokenKey = 'token_super_admin';
  private readonly userKey = 'super_admin_user';

  constructor(private http: HttpClient) {}

  iniciarSesion(email: string, contrasena: string): Observable<SuperAdminLoginResponse> {
    return new Observable((subscriber) => {
      this.http
        .post<SuperAdminLoginResponse>(`${this.apiBaseUrl}/plataforma/auth/iniciar-sesion`, {
          email,
          contrasena,
        })
        .subscribe({
          next: (respuesta) => {
            localStorage.setItem(this.tokenKey, respuesta.token_acceso);
            localStorage.setItem(this.userKey, JSON.stringify(respuesta.usuario));
            subscriber.next(respuesta);
            subscriber.complete();
          },
          error: (error) => subscriber.error(error),
        });
    });
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  obtenerToken(): string {
    return localStorage.getItem(this.tokenKey) ?? '';
  }

  obtenerUsuarioActual(): SuperAdminUsuario | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SuperAdminUsuario;
    } catch {
      return null;
    }
  }

  obtenerHeadersAuth(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.obtenerToken()}`,
    });
  }

  listarTenants(skip: number = 0, limit: number = 100): Observable<TenantAdmin[]> {
    return this.http.get<TenantAdmin[]>(`${this.apiBaseUrl}/plataforma/tenants?skip=${skip}&limit=${limit}`, {
      headers: this.obtenerHeadersAuth(),
    });
  }

  cambiarPlanTenant(tenantId: number, planCodigo: 'free' | 'pro'): Observable<TenantAdmin> {
    return this.http.patch<TenantAdmin>(
      `${this.apiBaseUrl}/plataforma/tenants/${tenantId}/plan`,
      { plan_codigo: planCodigo },
      { headers: this.obtenerHeadersAuth() },
    );
  }

  cambiarEstadoTenant(
    tenantId: number,
    payload: { estado: 'activo' | 'suspendido' | 'inactivo'; activo: boolean },
  ): Observable<TenantAdmin> {
    return this.http.patch<TenantAdmin>(`${this.apiBaseUrl}/plataforma/tenants/${tenantId}/estado`, payload, {
      headers: this.obtenerHeadersAuth(),
    });
  }
}
