// src/app/services/auth.service.ts
import { Injectable, Injector } from '@angular/core';  // ← Agregar Injector
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TallerRegistroPayload, TallerRegistroRespuesta, TallerRespuesta, TallerTokenRespuesta } from '../models/tipos';
import { FirebaseNotificationService } from './firebase-notification.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';
  private readonly tokenKey = 'token_taller';
  private readonly tenantSlugKey = 'tenant_slug';
  private readonly tenantSchemaKey = 'tenant_schema';
  private readonly tenantHeaderName = 'X-Tenant-Schema';
  private tallerSubject = new BehaviorSubject<TallerRespuesta | null>(null);
  public taller$ = this.tallerSubject.asObservable();
  private firebaseNotification!: FirebaseNotificationService;  // ← Declarar sin inicializar

  constructor(
    private http: HttpClient,
    private injector: Injector  // ← Inyectar Injector
  ) {
    this.restaurarSesion();
  }

  private getFirebaseService(): FirebaseNotificationService {
    if (!this.firebaseNotification) {
      this.firebaseNotification = this.injector.get(FirebaseNotificationService);
    }
    return this.firebaseNotification;
  }

  iniciarSesion(tenantSlug: string, email: string, contrasena: string): Observable<TallerTokenRespuesta> {
    const payload = { tenant_slug: tenantSlug, email, contrasena };
    return this.http.post<TallerTokenRespuesta>(`${this.apiBaseUrl}/talleres/iniciar-sesion`, payload).pipe(
      tap((respuesta) => {
        localStorage.setItem(this.tokenKey, respuesta.token_acceso);
        localStorage.setItem('taller_id', respuesta.taller.id.toString());
        localStorage.setItem(this.tenantSlugKey, respuesta.tenant_slug);
        localStorage.setItem(this.tenantSchemaKey, respuesta.tenant_schema);
        this.tallerSubject.next(respuesta.taller);
      }),
    );
  }

  registrarTaller(payload: TallerRegistroPayload): Observable<TallerRegistroRespuesta> {
    return this.http.post<TallerRegistroRespuesta>(`${this.apiBaseUrl}/talleres`, payload);
  }

  obtenerPerfil(): Observable<TallerRespuesta> {
    return this.http
      .get<TallerRespuesta>(`${this.apiBaseUrl}/talleres/perfil`, {
        headers: this.obtenerHeadersAuth(),
      })
      .pipe(
        tap((taller) => {
          this.tallerSubject.next(taller);
        }),
      );
  }

  async cerrarSesion(): Promise<void> {
    // Eliminar token de notificaciones web
    await this.getFirebaseService().eliminarToken();
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('taller_id');
    localStorage.removeItem(this.tenantSlugKey);
    localStorage.removeItem(this.tenantSchemaKey);
    this.tallerSubject.next(null);
  }

  obtenerTallerActual(): TallerRespuesta | null {
    return this.tallerSubject.value;
  }

  estaAutenticado(): boolean {
    return this.tallerSubject.value !== null && !!this.obtenerToken();
  }

  obtenerToken(): string {
    return localStorage.getItem(this.tokenKey) ?? '';
  }

  obtenerHeadersAuth(tokenAlterno?: string): HttpHeaders {
    const token = tokenAlterno ?? this.obtenerToken() ?? '';
    const tenantSchema = localStorage.getItem(this.tenantSchemaKey) ?? '';
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (tenantSchema) {
      headers[this.tenantHeaderName] = tenantSchema;
    }
    return new HttpHeaders(headers);
  }

  private restaurarSesion(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return;
    }

    this.obtenerPerfil().subscribe({
      error: () => {
        this.cerrarSesion();
      },
    });
  }
}