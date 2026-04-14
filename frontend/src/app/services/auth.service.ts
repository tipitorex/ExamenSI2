import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TallerRegistroPayload, TallerRespuesta, TallerTokenRespuesta } from '../models/tipos';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:8000/api/v1';
  private readonly tokenKey = 'token_taller';

  private tallerSubject = new BehaviorSubject<TallerRespuesta | null>(null);
  public taller$ = this.tallerSubject.asObservable();

  constructor(private http: HttpClient) {
    this.restaurarSesion();
  }

  iniciarSesion(email: string, contrasena: string): Observable<TallerTokenRespuesta> {
    const payload = { email, contrasena };
    return this.http.post<TallerTokenRespuesta>(`${this.apiBaseUrl}/talleres/iniciar-sesion`, payload).pipe(
      tap((respuesta) => {
        localStorage.setItem(this.tokenKey, respuesta.token_acceso);
        this.tallerSubject.next(respuesta.taller);
      }),
    );
  }

  registrarTaller(payload: TallerRegistroPayload): Observable<TallerRespuesta> {
    return this.http.post<TallerRespuesta>(`${this.apiBaseUrl}/talleres`, payload);
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

  cerrarSesion(): void {
    localStorage.removeItem(this.tokenKey);
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
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
