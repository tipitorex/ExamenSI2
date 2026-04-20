import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsignacionService, AsignacionTaller, AceptarRechazarPayload } from '../../services/asignacion.service';
import { IncidenteService, IncidenteCompleto } from '../../services/incidente.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-emergencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-emergencias.component.html',
  styleUrl: './dashboard-emergencias.component.scss',
})
export class DashboardEmergenciasComponent implements OnInit, OnDestroy {
  asignaciones: AsignacionTaller[] = [];
  loading = false;
  refreshInterval: any;
  
  // Filtros y búsqueda
  filtroActual: 'todas' | 'pendientes' | 'urgentes' = 'todas';
  busquedaTexto = '';
  
  // Modal para aceptar/rechazar
  modalAbierto = false;
  asignacionSeleccionada: AsignacionTaller | null = null;
  motivoRechazo = '';
  accionActual: 'aceptar' | 'rechazar' | null = null;
  
  // Modal para actualizar estado
  modalEstadoAbierto = false;
  asignacionParaEstado: AsignacionTaller | null = null;
  nuevoEstado = '';
  
  // Modal para ver detalles
  modalDetallesAbierto = false;
  asignacionDetalles: AsignacionTaller | null = null;
  incidenteCompleto: IncidenteCompleto | null = null;
  cargandoIncidente = false;

  constructor(
    private asignacionService: AsignacionService,
    private incidenteService: IncidenteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarAsignaciones();
    this.refreshInterval = setInterval(() => {
      this.cargarAsignaciones();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  cargarAsignaciones(): void {
    this.loading = true;
    this.asignacionService.listarAsignaciones().subscribe({
      next: (data: AsignacionTaller[]) => {
        this.asignaciones = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error cargando asignaciones:', err);
        this.loading = false;
      }
    });
  }

  get asignacionesPendientes(): AsignacionTaller[] {
    return this.asignaciones.filter(a => !a.es_aceptado);
  }

  get asignacionesActivas(): AsignacionTaller[] {
    return this.asignaciones.filter(a => a.es_aceptado && a.incidente?.estado !== 'atendido');
  }

  get asignacionesPendientesFiltradas(): AsignacionTaller[] {
    let filtradas = this.asignacionesPendientes;
    
    if (this.busquedaTexto.trim()) {
      const busqueda = this.busquedaTexto.toLowerCase();
      filtradas = filtradas.filter(a => 
        a.id.toString().includes(busqueda) ||
        a.incidente?.descripcion?.toLowerCase().includes(busqueda)
      );
    }
    
    if (this.filtroActual === 'urgentes') {
      filtradas = filtradas.filter(a => a.incidente?.prioridad === 'alta');
    }
    
    return filtradas;
  }

  get asignacionesActivasFiltradas(): AsignacionTaller[] {
    let filtradas = this.asignacionesActivas;
    
    if (this.busquedaTexto.trim()) {
      const busqueda = this.busquedaTexto.toLowerCase();
      filtradas = filtradas.filter(a => 
        a.id.toString().includes(busqueda) ||
        a.incidente?.descripcion?.toLowerCase().includes(busqueda)
      );
    }
    
    return filtradas;
  }

  get asignacionesFiltradas(): AsignacionTaller[] {
    return [...this.asignacionesPendientesFiltradas, ...this.asignacionesActivasFiltradas];
  }

  getPrioridadClass(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'priority-high';
      case 'media': return 'priority-medium';
      case 'baja': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  getPrioridadTexto(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'Alta Prioridad';
      case 'media': return 'Media Prioridad';
      case 'baja': return 'Baja Prioridad';
      default: return prioridad;
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'status-pending';
      case 'en_proceso': return 'status-progress';
      case 'atendido': return 'status-done';
      default: return 'status-pending';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'atendido': return 'Atendido';
      default: return estado;
    }
  }

  getBadgeClass(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'bg-red-600 text-white';
      case 'media': return 'bg-orange-500 text-white';
      case 'baja': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  }

  getBorderClass(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'border-red-500';
      case 'media': return 'border-orange-500';
      case 'baja': return 'border-gray-400';
      default: return 'border-gray-400';
    }
  }

  getDiagnosticoTags(clasificacion: string | null | undefined): string[] {
    if (!clasificacion) return ['GENERAL'];
    
    const tags: { [key: string]: string[] } = {
      'motor': ['MOTOR', 'ENFRIAMIENTO'],
      'bateria': ['BATERÍA', 'ELÉCTRICO'],
      'llanta': ['LLANTAS', 'NEUMÁTICO'],
      'frenos': ['FRENOS', 'SEGURIDAD'],
      'transmision': ['TRANSMISIÓN', 'MECÁNICO'],
      'choque': ['COLISIÓN', 'CARROCERÍA'],
      'calentamiento': ['MOTOR', 'SOBRECALENTAMIENTO'],
      'electrico': ['ELÉCTRICO', 'SISTEMAS']
    };
    
    const key = clasificacion.toLowerCase();
    for (const [k, value] of Object.entries(tags)) {
      if (key.includes(k)) {
        return value;
      }
    }
    
    return [clasificacion.toUpperCase()];
  }

  abrirGoogleMaps(lat: number | undefined, lng: number | undefined): void {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else {
      console.warn('Coordenadas no disponibles');
    }
  }

  aceptarSolicitud(asignacion: AsignacionTaller): void {
    this.asignacionSeleccionada = asignacion;
    this.accionActual = 'aceptar';
    this.modalAbierto = true;
  }

  rechazarSolicitud(asignacion: AsignacionTaller): void {
    this.asignacionSeleccionada = asignacion;
    this.accionActual = 'rechazar';
    this.motivoRechazo = '';
    this.modalAbierto = true;
  }

  confirmarAccion(): void {
    if (!this.asignacionSeleccionada) return;

    const payload: AceptarRechazarPayload = {
      es_aceptado: this.accionActual === 'aceptar'
    };

    if (this.accionActual === 'rechazar' && this.motivoRechazo) {
      payload.motivo_rechazo = this.motivoRechazo;
    }

    this.asignacionService.aceptarRechazar(this.asignacionSeleccionada.id, payload).subscribe({
      next: () => {
        this.modalAbierto = false;
        this.asignacionSeleccionada = null;
        this.motivoRechazo = '';
        this.accionActual = null;
        this.cargarAsignaciones();
      },
      error: (err: any) => {
        console.error('Error procesando solicitud:', err);
        alert('Error al procesar la solicitud');
      }
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.asignacionSeleccionada = null;
    this.motivoRechazo = '';
    this.accionActual = null;
  }

  cambiarEstado(asignacion: AsignacionTaller, nuevoEstado: string): void {
    this.asignacionParaEstado = asignacion;
    this.nuevoEstado = nuevoEstado;
    this.modalEstadoAbierto = true;
  }

  confirmarCambioEstado(): void {
    if (!this.asignacionParaEstado) return;

    this.asignacionService.actualizarEstadoIncidente(this.asignacionParaEstado.id, { estado: this.nuevoEstado }).subscribe({
      next: () => {
        this.modalEstadoAbierto = false;
        this.asignacionParaEstado = null;
        this.cargarAsignaciones();
      },
      error: (err: any) => {
        console.error('Error actualizando estado:', err);
        alert('Error al actualizar el estado');
      }
    });
  }

  cerrarModalEstado(): void {
    this.modalEstadoAbierto = false;
    this.asignacionParaEstado = null;
  }

  verDetalles(asignacion: AsignacionTaller): void {
    this.asignacionDetalles = asignacion;
    this.modalDetallesAbierto = true;
    this.cargandoIncidente = true;
    this.incidenteCompleto = null;
    
    // Cargar los datos completos del incidente
    this.incidenteService.obtenerIncidente(asignacion.incidente_id).subscribe({
      next: (incidente) => {
        this.incidenteCompleto = incidente;
        this.cargandoIncidente = false;
      },
      error: (err) => {
        console.error('Error cargando incidente:', err);
        this.cargandoIncidente = false;
      }
    });
  }

  cerrarModalDetalles(): void {
    this.modalDetallesAbierto = false;
    this.asignacionDetalles = null;
    this.incidenteCompleto = null;
  }

  cambiarFiltro(filtro: 'todas' | 'pendientes' | 'urgentes'): void {
    this.filtroActual = filtro;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffMin < 1440) return `Hace ${Math.floor(diffMin / 60)} h`;
    return date.toLocaleDateString();
  }

  recargarManual(): void {
    this.cargarAsignaciones();
  }
}