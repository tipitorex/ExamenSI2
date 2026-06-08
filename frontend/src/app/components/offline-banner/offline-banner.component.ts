import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineQueueService } from '../../services/offline-queue.service';
import { ConnectionStatusService } from '../../services/connection-status.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" class="offline-banner" [ngClass]="bannerClass">
      <span class="banner-icon">{{ icono }}</span>
      <span class="banner-texto">{{ mensaje }}</span>
      <button *ngIf="mostrarReintentar" class="btn-reintentar" (click)="reintentar()">
        REINTENTAR
      </button>
      <div *ngIf="sincronizando" class="spinner"></div>
    </div>
  `,
  styles: [`
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      width: 100%;
      box-sizing: border-box;
      z-index: 9999;
      transition: background 0.3s ease;
    }
    .offline-banner.naranja { background: #e65100; }
    .offline-banner.azul    { background: #1565c0; }
    .offline-banner.rojo    { background: #b71c1c; }
    .offline-banner.verde   { background: #2e7d32; }

    .banner-texto { flex: 1; }

    .btn-reintentar {
      background: transparent;
      border: 1.5px solid #fff;
      color: #fff;
      padding: 3px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
    }
    .btn-reintentar:hover { background: rgba(255,255,255,0.15); }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  visible = false;
  sincronizando = false;
  pendientes = 0;
  ultimoError: string | null = null;
  online = true;
  conexionRestablecida = false;

  private prevOnline = true;
  private timerRestablecida: ReturnType<typeof setTimeout> | null = null;

  get bannerClass(): string {
    if (this.conexionRestablecida) return 'verde';
    if (this.sincronizando) return 'azul';
    if (this.ultimoError) return 'rojo';
    return 'naranja';
  }

  get icono(): string {
    if (this.conexionRestablecida) return '✅';
    if (this.sincronizando) return '🔄';
    if (this.ultimoError) return '⚠️';
    return '📵';
  }

  get mensaje(): string {
    if (this.conexionRestablecida && this.sincronizando) return 'Conexión restablecida — sincronizando...';
    if (this.conexionRestablecida) return 'Conexión restablecida';
    if (this.sincronizando) return 'Sincronizando emergencia...';
    if (this.ultimoError) return this.ultimoError;
    if (!this.online && this.pendientes > 0) {
      return this.pendientes === 1
        ? 'Sin conexión · 1 emergencia guardada localmente'
        : `Sin conexión · ${this.pendientes} emergencias guardadas localmente`;
    }
    if (!this.online) return 'Sin conexión — mostrando datos guardados';
    if (this.pendientes > 0) {
      return this.pendientes === 1
        ? '1 emergencia pendiente de sincronizar'
        : `${this.pendientes} emergencias pendientes de sincronizar`;
    }
    return '';
  }

  get mostrarReintentar(): boolean {
    return !!this.ultimoError && !this.sincronizando;
  }

  constructor(
    private offlineQueue: OfflineQueueService,
    private connectionStatus: ConnectionStatusService,
  ) {}

  ngOnInit(): void {
    this.connectionStatus.online$.subscribe(online => {
      const seRecupero = !this.prevOnline && online;
      this.prevOnline = online;
      this.online = online;

      if (seRecupero) {
        this._mostrarRestablecida();
      }

      this.actualizarVisibilidad();
    });

    this.offlineQueue.pendientesCount$.subscribe(n => {
      this.pendientes = n;
      this.actualizarVisibilidad();
    });

    this.offlineQueue.sincronizando$.subscribe(v => {
      this.sincronizando = v;
      // Si termina de sincronizar y ya estaba mostrando "restablecida", extender el timer
      if (!v && this.conexionRestablecida) {
        this._programarOcultarRestablecida(2000);
      }
      this.actualizarVisibilidad();
    });

    this.offlineQueue.ultimoError$.subscribe(err => {
      this.ultimoError = err;
      this.actualizarVisibilidad();
    });
  }

  ngOnDestroy(): void {
    if (this.timerRestablecida) clearTimeout(this.timerRestablecida);
  }

  reintentar(): void {
    this.offlineQueue.reintentarErrores();
  }

  private _mostrarRestablecida(): void {
    this.conexionRestablecida = true;
    this.visible = true;

    // Si hay pendientes que se van a sincronizar, esperar a que terminen antes de ocultar
    // Si no hay pendientes, ocultar después de 2.5 s
    if (this.pendientes === 0 && !this.sincronizando) {
      this._programarOcultarRestablecida(2500);
    }
  }

  private _programarOcultarRestablecida(ms: number): void {
    if (this.timerRestablecida) clearTimeout(this.timerRestablecida);
    this.timerRestablecida = setTimeout(() => {
      this.conexionRestablecida = false;
      this.actualizarVisibilidad();
    }, ms);
  }

  private actualizarVisibilidad(): void {
    this.visible =
      this.conexionRestablecida ||
      !this.online ||
      this.sincronizando ||
      this.pendientes > 0 ||
      !!this.ultimoError;
  }
}
