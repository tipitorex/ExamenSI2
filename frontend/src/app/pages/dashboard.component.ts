import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TallerRespuesta } from '../models/tipos';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  tallerActual: TallerRespuesta | null = null;
  mostrarNotificaciones = false;
  mostrarMenuCuenta = false;

  readonly notificaciones = [
    {
      titulo: 'Nueva emergencia detectada',
      mensaje: 'Se registro un incidente de prioridad alta en Zona Centro.',
      hora: 'Hace 2 min',
      leida: false,
    },
    {
      titulo: 'Tecnico disponible',
      mensaje: 'Carlos Mendez marco disponibilidad nuevamente.',
      hora: 'Hace 18 min',
      leida: true,
    },
    {
      titulo: 'Recordatorio de seguimiento',
      mensaje: 'Revisa incidentes en progreso con mas de 30 minutos.',
      hora: 'Hace 1 h',
      leida: false,
    },
  ];

  readonly menu = [
    { etiqueta: 'Dashboard', icono: 'dashboard', ruta: 'inicio' },
    { etiqueta: 'Tecnicos', icono: 'engineering', ruta: 'tecnicos' },
    { etiqueta: 'Emergencias Activas', icono: 'emergency', ruta: 'emergencias-activas' },
    { etiqueta: 'Mapa de Operaciones', icono: 'map', ruta: 'mapa-operaciones' },
    { etiqueta: 'Historial', icono: 'history', ruta: 'historial' },
    { etiqueta: 'Configuracion', icono: 'settings', ruta: 'configuracion' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller: TallerRespuesta | null) => {
      this.tallerActual = taller;
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
    }
  }

  toggleMenuCuenta(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarMenuCuenta = !this.mostrarMenuCuenta;
    if (this.mostrarMenuCuenta) {
      this.mostrarNotificaciones = false;
    }
  }

  marcarNotificacionesComoLeidas(): void {
    this.notificaciones.forEach((item) => {
      item.leida = true;
    });
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
    return this.notificaciones.filter((item) => !item.leida).length;
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
