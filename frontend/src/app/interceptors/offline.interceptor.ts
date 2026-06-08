import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConnectionStatusService } from '../services/connection-status.service';
import { OfflineQueueService } from '../services/offline-queue.service';

const CACHE_PREFIX = 'pwa_cache_';

export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const connectionStatus = inject(ConnectionStatusService);
  const offlineQueue = inject(OfflineQueueService);

  const esApiNuestra = req.url.includes('/api/v1');

  const esCrearIncidente =
    req.method === 'POST' &&
    req.url.includes('/incidentes') &&
    !req.url.includes('/cancelar') &&
    !req.url.includes('/estado');

  const esGet = req.method === 'GET' && esApiNuestra;

  // ─── GET sin red: devolver caché si existe ────────────────────────────────
  if (esGet && !connectionStatus.estaOnline) {
    const cached = _leerCache(req.urlWithParams);
    if (cached !== null) {
      return of(new HttpResponse({ status: 200, body: cached, url: req.url }));
    }
  }

  // ─── POST /incidentes sin red: encolar localmente ─────────────────────────
  if (!connectionStatus.estaOnline && esCrearIncidente) {
    const datos = _extraerDatosFormData(req.body);
    offlineQueue.encolarIncidente(datos);
    return of(new HttpResponse({
      status: 200,
      body: { offline: true, mensaje: 'Emergencia guardada localmente' },
    }));
  }

  // ─── Con red: ejecutar la petición normalmente ────────────────────────────
  return next(req).pipe(
    tap(event => {
      // Guardar en caché cada GET exitoso para usarlo cuando no haya red
      if (esGet && event instanceof HttpResponse && event.status === 200) {
        _guardarCache(req.urlWithParams, event.body);
      }
    }),
    catchError(err => {
      const esErrorDeRed =
        err.status === 0 ||
        err.message?.includes('Http failure response') ||
        err.message?.includes('NetworkError');

      // POST incidente que falló por red → encolar
      if (esCrearIncidente && esErrorDeRed) {
        const datos = _extraerDatosFormData(req.body);
        offlineQueue.encolarIncidente(datos);
        return of(new HttpResponse({
          status: 200,
          body: { offline: true, mensaje: 'Emergencia guardada localmente' },
        }));
      }

      // GET que falló por red → servir caché si existe
      if (esGet && esErrorDeRed) {
        const cached = _leerCache(req.urlWithParams);
        if (cached !== null) {
          return of(new HttpResponse({ status: 200, body: cached, url: req.url }));
        }
      }

      return throwError(() => err);
    }),
  );
};

// ─── Helpers de caché ────────────────────────────────────────────────────────

function _guardarCache(url: string, body: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(body));
  } catch {
    // localStorage lleno: limpiar entradas antiguas y reintentar
    _limpiarEntradasAntiguas();
    try {
      localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(body));
    } catch { /* si sigue sin espacio, ignorar */ }
  }
}

function _leerCache(url: string): unknown | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _limpiarEntradasAntiguas(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  // Borrar la mitad más antigua (las primeras en el array)
  keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
}

function _extraerDatosFormData(body: unknown): Record<string, unknown> {
  if (body instanceof FormData) {
    const result: Record<string, unknown> = {};
    body.forEach((value, key) => {
      result[key] = value instanceof File ? null : value;
    });
    return result;
  }
  if (typeof body === 'object' && body !== null) {
    return body as Record<string, unknown>;
  }
  return {};
}
