// src/app/services/auth.service.ts
import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TallerRegistroPayload, TallerRespuesta, TallerTokenRespuesta } from '../models/tipos';
import { FirebaseNotificationService } from './firebase-notification.service';
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
  
  private firebaseNotification!: FirebaseNotificationService;

  constructor(
    private http: HttpClient,
    private injector: Injector,
    private router: Router
  ) {
    this.restaurarSesion();
  }

  private getFirebaseService(): FirebaseNotificationService {
    if (!this.firebaseNotification) {
      this.firebaseNotification = this.injector.get(FirebaseNotificationService);
    }
    return this.firebaseNotification;
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
    const rol = this.obtenerRol();
    
    if (rol === 'taller') {
      await this.getFirebaseService().eliminarToken();
    }
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolKey);
    localStorage.removeItem(this.usuarioIdKey);
    localStorage.removeItem('taller_id');
    
    this.tallerSubject.next(null);
    this.rolSubject.next(null);
    
    this.router.navigate(['/iniciar-sesion']);
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
    
    if (!token || !rol) {
      return;
    }
    
    this.rolSubject.next(rol);
    
    if (rol === 'taller') {
      this.obtenerPerfilTaller().subscribe({
        error: () => {
          this.cerrarSesion();
        },
      });
    }
  }
}