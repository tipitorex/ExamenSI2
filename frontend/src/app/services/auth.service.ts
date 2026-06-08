// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TallerRegistroPayload, TallerRespuesta, TallerTokenRespuesta } from '../models/tipos';
import { Router } from '@angular/router';

// Respuesta unificada de login
export interface LoginRespuesta {
  token_acceso: string;
  tipo_token: string;
  rol: 'cliente' | 'taller' | 'super_admin';
  usuario_id: number;
  redirigir_a: string;
  taller?: TallerRespuesta;
  cliente?: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';
  private readonly tokenKey = 'token';
  private readonly rolKey = 'rol';
  private readonly usuarioIdKey = 'usuario_id';
  
  private tallerSubject = new BehaviorSubject<TallerRespuesta | null>(null);
  public taller$ = this.tallerSubject.asObservable();

  private rolSubject = new BehaviorSubject<string | null>(null);
  public rol$ = this.rolSubject.asObservable();

  /** Emite cuando el usuario cierra sesión — otros servicios pueden suscribirse */
  readonly sesionCerrada$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.restaurarSesion();
  }

  // ============================================================
  // LOGIN UNIFICADO (Super Admin, Taller, Cliente)
  // ============================================================
  
  iniciarSesion(email: string, contrasena: string): Observable<LoginRespuesta> {
    const payload = { email, contrasena };
    return this.http.post<LoginRespuesta>(`${this.apiBaseUrl}/autenticacion/iniciar-sesion`, payload).pipe(
      tap((respuesta) => {
        // Guardar datos comunes
        localStorage.setItem(this.tokenKey, respuesta.token_acceso);
        localStorage.setItem(this.rolKey, respuesta.rol);
        localStorage.setItem(this.usuarioIdKey, respuesta.usuario_id.toString());
        
        this.rolSubject.next(respuesta.rol);
        
        // Si es taller, guardar datos específicos
        if (respuesta.rol === 'taller' && respuesta.taller) {
          localStorage.setItem('taller_id', respuesta.taller.id.toString());
          localStorage.setItem('taller_datos', JSON.stringify(respuesta.taller));
          this.tallerSubject.next(respuesta.taller);
        }
        
        // Redirigir según el rol
        this.router.navigate([respuesta.redirigir_a]);
      }),
    );
  }

  // ============================================================
  // REGISTRO DE TALLER
  // ============================================================
  
  registrarTaller(payload: TallerRegistroPayload): Observable<TallerRespuesta> {
    return this.http.post<TallerRespuesta>(`${this.apiBaseUrl}/talleres`, payload);
  }

  // ============================================================
  // OBTENER PERFIL DEL TALLER
  // ============================================================

  obtenerPerfilTaller(): Observable<TallerRespuesta> {
    return this.http
      .get<TallerRespuesta>(`${this.apiBaseUrl}/talleres/perfil`, {
        headers: this.obtenerHeadersAuth(),
      })
      .pipe(
        tap((taller) => {
          this.tallerSubject.next(taller);
          localStorage.setItem('taller_datos', JSON.stringify(taller));
        }),
      );
  }

  // ============================================================
  // OBTENER PERFIL (alias para compatibilidad)
  // ============================================================
  
  obtenerPerfil(): Observable<TallerRespuesta> {
    return this.obtenerPerfilTaller();
  }

  // ============================================================
  // CIERRE DE SESIÓN
  // ============================================================
  
  async cerrarSesion(): Promise<void> {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolKey);
    localStorage.removeItem(this.usuarioIdKey);
    localStorage.removeItem('taller_id');
    localStorage.removeItem('taller_datos');

    this.tallerSubject.next(null);
    this.rolSubject.next(null);
    this.sesionCerrada$.next();

    this.router.navigate(['/']);
  }

  // ============================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================
  
  obtenerTallerActual(): TallerRespuesta | null {
    return this.tallerSubject.value;
  }

  obtenerRol(): string | null {
    return localStorage.getItem(this.rolKey);
  }

  obtenerUsuarioId(): number | null {
    const id = localStorage.getItem(this.usuarioIdKey);
    return id ? parseInt(id) : null;
  }

  esSuperAdmin(): boolean {
    return this.obtenerRol() === 'super_admin';
  }

  esTaller(): boolean {
    return this.obtenerRol() === 'taller';
  }

  esCliente(): boolean {
    return this.obtenerRol() === 'cliente';
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  obtenerToken(): string {
    return localStorage.getItem(this.tokenKey) ?? '';
  }

  obtenerHeadersAuth(tokenAlterno?: string): HttpHeaders {
    const token = tokenAlterno ?? this.obtenerToken() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ============================================================
  // RESTAURAR SESIÓN
  // ============================================================
  
  private restaurarSesion(): void {
    const token = localStorage.getItem(this.tokenKey);
    const rol = localStorage.getItem(this.rolKey);

    if (!token || !rol) return;

    this.rolSubject.next(rol);

    if (rol === 'taller') {
      // Restaurar datos del taller desde caché local de forma inmediata
      // para que el dashboard no quede vacío mientras llega la respuesta del servidor.
      const tallerCache = localStorage.getItem('taller_datos');
      if (tallerCache) {
        try {
          this.tallerSubject.next(JSON.parse(tallerCache));
        } catch { /* caché corrupto, se ignora */ }
      }

      // Actualizar en background. Si falla (red caída, backend reiniciando) NO
      // cerramos sesión — el token sigue guardado y es válido.
      // Un error 401 real lo manejará la próxima llamada autenticada.
      this.obtenerPerfilTaller().subscribe({ error: () => {} });
    }
  }
}