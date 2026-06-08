import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { ConnectionStatusService } from './connection-status.service';

export interface IncidentePendienteWeb {
  localUuid: string;
  datos: Record<string, unknown>;
  estado: 'pendiente' | 'sincronizado' | 'error';
  creadoEn: string;
  incidenteIdRemoto?: number;
  reintentos: number;
  errorMensaje?: string;
}

const DB_NAME = 'ceroespera_offline';
const STORE_NAME = 'incidentes_pendientes';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private db: IDBDatabase | null = null;
  readonly pendientesCount$ = new BehaviorSubject<number>(0);
  readonly sincronizando$ = new BehaviorSubject<boolean>(false);
  readonly ultimoError$ = new BehaviorSubject<string | null>(null);

  // AuthService se inyecta de forma lazy para romper el ciclo:
  // OfflineQueueService → AuthService → HttpClient → offlineInterceptor → OfflineQueueService
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  constructor(
    private injector: Injector,
    private connectionStatus: ConnectionStatusService,
  ) {
    this.abrirDB().then(() => this.actualizarContador());

    this.connectionStatus.online$.subscribe(online => {
      if (online) this.sincronizarPendientes();
    });
  }

  private abrirDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localUuid' });
          store.createIndex('estado', 'estado');
        }
      };
      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async encolarIncidente(datos: Record<string, unknown>): Promise<string> {
    const localUuid = crypto.randomUUID();
    const registro: IncidentePendienteWeb = {
      localUuid,
      datos,
      estado: 'pendiente',
      creadoEn: new Date().toISOString(),
      reintentos: 0,
    };
    await this.guardarRegistro(registro);
    await this.actualizarContador();
    return localUuid;
  }

  async obtenerPendientes(): Promise<IncidentePendienteWeb[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('estado');
      const req = idx.getAll('pendiente');
      req.onsuccess = () => resolve(req.result as IncidentePendienteWeb[]);
      req.onerror = () => reject(req.error);
    });
  }

  async obtenerTodos(): Promise<IncidentePendienteWeb[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as IncidentePendienteWeb[]);
      req.onerror = () => reject(req.error);
    });
  }

  async sincronizarPendientes(): Promise<void> {
    if (this.sincronizando$.value) return;
    const pendientes = await this.obtenerPendientes();
    if (pendientes.length === 0) return;

    this.sincronizando$.next(true);
    this.ultimoError$.next(null);

    for (const registro of pendientes) {
      try {
        const id = await this.enviarIncidente(registro);
        await this.marcarSincronizado(registro.localUuid, id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('401') || msg.includes('Unauthorized')) {
          this.ultimoError$.next('Sesión expirada. Inicia sesión para sincronizar.');
          break;
        }
        await this.marcarError(registro.localUuid, msg);
      }
    }

    this.sincronizando$.next(false);
    await this.actualizarContador();
  }

  private async enviarIncidente(registro: IncidentePendienteWeb): Promise<number> {
    const token = this.authService.obtenerToken();
    const datos = registro.datos;

    const formData = new FormData();
    formData.append('vehiculo_id', String(datos['vehiculo_id']));
    formData.append('latitud', String(datos['latitud']));
    formData.append('longitud', String(datos['longitud']));
    formData.append('prioridad', String(datos['prioridad'] ?? 'media'));
    formData.append('client_request_id', registro.localUuid);
    if (datos['descripcion']) formData.append('descripcion', String(datos['descripcion']));

    const response = await fetch('http://localhost:8000/api/v1/incidentes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (response.status === 401) throw new Error('401 Sesión expirada');
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    const data = await response.json();
    return data.id as number;
  }

  private guardarRegistro(registro: IncidentePendienteWeb): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB no inicializada'));
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(registro);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async marcarSincronizado(localUuid: string, incidenteIdRemoto: number): Promise<void> {
    const pendientes = await this.obtenerTodos();
    const registro = pendientes.find(r => r.localUuid === localUuid);
    if (!registro) return;
    await this.guardarRegistro({ ...registro, estado: 'sincronizado', incidenteIdRemoto });
  }

  private async marcarError(localUuid: string, mensaje: string): Promise<void> {
    const pendientes = await this.obtenerTodos();
    const registro = pendientes.find(r => r.localUuid === localUuid);
    if (!registro) return;
    await this.guardarRegistro({
      ...registro,
      estado: registro.reintentos >= 4 ? 'error' : 'pendiente',
      reintentos: registro.reintentos + 1,
      errorMensaje: mensaje,
    });
  }

  async reintentarErrores(): Promise<void> {
    const todos = await this.obtenerTodos();
    for (const r of todos.filter(r => r.estado === 'error')) {
      await this.guardarRegistro({ ...r, estado: 'pendiente', errorMensaje: undefined });
    }
    await this.sincronizarPendientes();
  }

  private async actualizarContador(): Promise<void> {
    const pendientes = await this.obtenerPendientes();
    this.pendientesCount$.next(pendientes.length);
  }
}
