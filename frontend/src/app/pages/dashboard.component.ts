// src/app/pages/dashboard/dashboard.component.ts
import { Component, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificacionService, NotificacionRespuesta } from '../services/notificacion.service';
import { TallerRespuesta } from '../models/tipos';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  tallerActual: TallerRespuesta | null = null;
  mostrarNotificaciones = false;
  mostrarMenuCuenta = false;
  
  // Notificaciones reales desde el backend
  notificaciones: NotificacionRespuesta[] = [];
  
  // Subscription para polling y otros observables
  private pollingSubscription?: Subscription;
  private tallerSubscription?: Subscription;

  readonly menu = [
    { etiqueta: 'Dashboard', icono: 'dashboard', ruta: 'inicio' },
    { etiqueta: 'Tecnicos', icono: 'engineering', ruta: 'tecnicos' },
    { etiqueta: 'Emergencias Activas', icono: 'emergency', ruta: 'emergencias-activas' },
    { etiqueta: 'Facturación', icono: 'receipt', ruta: 'facturacion' },
    { etiqueta: 'Mapa de Operaciones', icono: 'map', ruta: 'mapa-operaciones' },
    { etiqueta: 'Historial', icono: 'history', ruta: 'historial' },
    { etiqueta: 'Reportes', icono: 'bar_chart', ruta: 'reportes' }, 
    { etiqueta: 'Configuracion', icono: 'settings', ruta: 'configuracion' },
  ];

  constructor(
    private authService: AuthService,
    private notificacionService: NotificacionService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    // Suscribirse al taller actual
    this.tallerSubscription = this.authService.taller$.subscribe((taller: TallerRespuesta | null) => {
      this.tallerActual = taller;
      if (taller) {
        // Si hay taller logueado, cargar notificaciones
        this.cargarNotificaciones();
        this.iniciarPollingNotificaciones();
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar subscriptions para evitar memory leaks
    this.pollingSubscription?.unsubscribe();
    this.tallerSubscription?.unsubscribe();
  }

  /**
   * Cargar notificaciones desde el backend
   */
  cargarNotificaciones(): void {
    this.notificacionService.obtenerNotificaciones().subscribe({
      next: (notificaciones) => {
        this.notificaciones = notificaciones.sort((a, b) => 
          new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime()
        );
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
      }
    });
  }

  /**
   * Iniciar polling cada 30 segundos para ver nuevas notificaciones
   */
  iniciarPollingNotificaciones(): void {
    this.pollingSubscription = interval(30000).pipe(
      switchMap(() => this.notificacionService.obtenerNotificaciones())
    ).subscribe({
      next: (notificaciones) => {
        this.notificaciones = notificaciones.sort((a, b) => 
          new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime()
        );
      },
      error: (error) => {
        console.error('Error en polling de notificaciones:', error);
      }
    });
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }

  toggleNotificaciones(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) {
      this.mostrarMenuCuenta = false;
      // Cuando se abre el panel, marcar todas como leídas automáticamente
      this.marcarTodasComoLeidas();
    }
  }

  toggleMenuCuenta(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarMenuCuenta = !this.mostrarMenuCuenta;
    if (this.mostrarMenuCuenta) {
      this.mostrarNotificaciones = false;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasComoLeidas(): void {
    const noLeidas = this.notificaciones.filter(n => !n.leido).map(n => n.id);
    if (noLeidas.length === 0) return;

    this.notificacionService.marcarMultiplesComoLeidas(noLeidas).subscribe({
      next: () => {
        // Actualizar estado local
        this.notificaciones = this.notificaciones.map(n => ({
          ...n,
          leido: true
        }));
      },
      error: (error) => {
        console.error('Error al marcar notificaciones como leídas:', error);
      }
    });
  }

  /**
   * Marcar una notificación específica como leída
   */
  marcarNotificacionComoLeida(notificacion: NotificacionRespuesta): void {
    if (notificacion.leido) return;

    this.notificacionService.marcarLeida(notificacion.id, true).subscribe({
      next: (actualizada) => {
        const index = this.notificaciones.findIndex(n => n.id === actualizada.id);
        if (index !== -1) {
          this.notificaciones[index] = actualizada;
        }
      },
      error: (error) => {
        console.error('Error al marcar notificación como leída:', error);
      }
    });
  }

  /**
   * Redirigir a Emergencias Activas al hacer clic en una notificación
   */
  irAEmergenciasActivasDesdeNotificacion(notificacion: NotificacionRespuesta): void {
    // Marcar como leída si no lo está
    if (!notificacion.leido) {
      this.marcarNotificacionComoLeida(notificacion);
    }
    
    // Cerrar el panel de notificaciones
    this.mostrarNotificaciones = false;
    
    // Redirigir a la página de emergencias activas
    this.router.navigate(['/dashboard/emergencias-activas']);
  }

  abrirConfiguracion(): void {
    this.mostrarMenuCuenta = false;
    this.router.navigate(['/dashboard/configuracion']);
  }

  verHistorialNotificaciones(): void {
    this.mostrarNotificaciones = false;
    this.router.navigate(['/dashboard/historial']);
  }

  obtenerInicialesCuenta(): string {
    const nombre = this.tallerActual?.nombre?.trim() || 'Taller';
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  cantidadNoLeidas(): number {
    return this.notificaciones.filter((item) => !item.leido).length;
  }

  /**
   * Formatear fecha relativa (ej: "Hace 2 min", "Hace 1 hora", etc)
   */
  formatearFechaRelativa(fecha: string): string {
    const ahora = new Date();
    const fechaDate = new Date(fecha);
    const diffMs = ahora.getTime() - fechaDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentoClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.mostrarNotificaciones = false;
      this.mostrarMenuCuenta = false;
    }
  }

  irAEmergenciasActivas(): void {
    this.router.navigate(['/dashboard/emergencias-activas']);
  }
}