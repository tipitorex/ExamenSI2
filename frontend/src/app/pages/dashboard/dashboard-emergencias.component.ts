import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AsignacionService, AsignacionTaller, AceptarRechazarPayload } from '../../services/asignacion.service';
import { IncidenteService } from '../../services/incidente.service';
import { AuthService } from '../../services/auth.service';
import { CotizacionService, CotizacionCrear } from '../../services/cotizacion.service';
import { TallerServiciosService, TallerServicio } from '../../services/taller-servicios.service';
import { ConnectionStatusService } from '../../services/connection-status.service';
import { ModalSeleccionTecnicoComponent } from '../../components/modal-seleccion-tecnico/modal-seleccion-tecnico.component';

@Component({
  selector: 'app-dashboard-emergencias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ModalSeleccionTecnicoComponent],
  templateUrl: './dashboard-emergencias.component.html',
  styleUrl: './dashboard-emergencias.component.scss',
})
export class DashboardEmergenciasComponent implements OnInit, OnDestroy {
  asignaciones: AsignacionTaller[] = [];
  loading = false;
  refreshInterval: any;
  private connectionSub?: Subscription;
  private prevOnline = true;
  
  // Filtros y búsqueda
  filtroActual: 'todas' | 'pendientes' | 'en_camino' | 'atendiendo' | 'finalizados' = 'todas';
  busquedaTexto = '';
  
  // Modal para aceptar/rechazar (viejo, se mantiene solo para rechazar)
  modalAbierto = false;
  asignacionSeleccionada: AsignacionTaller | null = null;
  motivoRechazo = '';
  accionActual: 'aceptar' | 'rechazar' | null = null;
  
  // Modal para actualizar estado
  modalEstadoAbierto = false;
  asignacionParaEstado: AsignacionTaller | null = null;
  nuevoEstado = '';
  
  // Modal para selección de técnico
  mostrarModalTecnico = false;
  asignacionParaTecnico: AsignacionTaller | null = null;

  // Modal para cancelar (taller cancela incidente activo)
  modalCancelarAbierto = false;
  asignacionParaCancelar: AsignacionTaller | null = null;
  motivoCancelacion = '';
  cancelando = false;

  // Modal para cotizar
  modalCotizarAbierto = false;
  asignacionParaCotizar: AsignacionTaller | null = null;
  enviandoCotizacion = false;
  cotizarForm: CotizacionCrear = { incidente_id: 0, items: [], tiempo_estimado_reparacion_horas: 0 };
  formMontoTotal = 0;
  formTiempoMinutos = 0;
  catalogoServicios: TallerServicio[] = [];
  serviciosSeleccionados = new Set<number>();

  constructor(
    private asignacionService: AsignacionService,
    private incidenteService: IncidenteService,
    private authService: AuthService,
    private cotizacionService: CotizacionService,
    private tallerServiciosService: TallerServiciosService,
    private connectionStatus: ConnectionStatusService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.prevOnline = this.connectionStatus.estaOnline;
    this.cargarAsignaciones();
    this.cargarCatalogoServicios();
    this.refreshInterval = setInterval(() => this.cargarAsignaciones(), 30000);

    this.connectionSub = this.connectionStatus.online$.subscribe(online => {
      const seRecupero = !this.prevOnline && online;
      this.prevOnline = online;
      if (seRecupero) this.cargarAsignaciones();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.connectionSub?.unsubscribe();
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

  // ============================================================
  // NUEVO MÉTODO: Navegar al tracking en tiempo real
  // ============================================================
  irATracking(incidenteId: number | undefined): void {
    if (!incidenteId) {
      console.warn('⚠️ No hay ID de incidente para tracking');
      return;
    }
    this.router.navigate(['/dashboard/tracking', incidenteId]);
  }

  get asignacionesFiltradas(): AsignacionTaller[] {
    let resultado = this.asignaciones;

    if (this.busquedaTexto.trim()) {
      const t = this.busquedaTexto.toLowerCase();
      resultado = resultado.filter(a =>
        a.id.toString().includes(t) ||
        a.incidente?.descripcion?.toLowerCase().includes(t) ||
        a.incidente?.vehiculo?.marca?.toLowerCase().includes(t) ||
        a.incidente?.vehiculo?.modelo?.toLowerCase().includes(t) ||
        (a.incidente?.vehiculo as any)?.placa?.toLowerCase().includes(t)
      );
    }

    switch (this.filtroActual) {
      case 'pendientes':
        return resultado.filter(a => !a.es_aceptado);
      case 'en_camino':
        return resultado.filter(a => a.incidente?.estado === 'en_camino');
      case 'atendiendo':
        return resultado.filter(a =>
          a.incidente?.estado === 'atencion' || a.incidente?.estado === 'en_atencion'
        );
      case 'finalizados':
        return resultado.filter(a =>
          a.incidente?.estado === 'atendido' || a.incidente?.estado === 'finalizado'
        );
      default:
        return resultado.filter(a =>
          a.incidente?.estado !== 'atendido' && a.incidente?.estado !== 'finalizado'
        );
    }
  }

  contarPorEstado(estado: string): number {
    switch (estado) {
      case 'pendientes': return this.asignaciones.filter(a => !a.es_aceptado).length;
      case 'en_camino':  return this.asignaciones.filter(a => a.incidente?.estado === 'en_camino').length;
      case 'atendiendo': return this.asignaciones.filter(a => a.incidente?.estado === 'atencion' || a.incidente?.estado === 'en_atencion').length;
      case 'finalizados':return this.asignaciones.filter(a => a.incidente?.estado === 'atendido' || a.incidente?.estado === 'finalizado').length;
      default:           return this.asignaciones.filter(a => a.incidente?.estado !== 'atendido' && a.incidente?.estado !== 'finalizado').length;
    }
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
    this.asignacionParaTecnico = asignacion;
    this.mostrarModalTecnico = true;
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

  cerrarModalTecnico(): void {
    this.mostrarModalTecnico = false;
    this.asignacionParaTecnico = null;
  }

  onTecnicoAsignado(event: { tecnicoId: number, tiempoEstimado: number | null }): void {
    this.cerrarModalTecnico();
    this.cargarAsignaciones();
    alert('✅ Servicio aceptado y técnico asignado correctamente');
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

  cambiarFiltro(filtro: 'todas' | 'pendientes' | 'en_camino' | 'atendiendo' | 'finalizados'): void {
    this.filtroActual = filtro;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    const date = new Date(fecha);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffMin < 1440) return `Hace ${Math.floor(diffMin / 60)} h`;
    return date.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  recargarManual(): void {
    this.cargarAsignaciones();
  }

  // ============================================================
  // CANCELAR EMERGENCIA (desde el taller)
  // ============================================================
  abrirModalCancelar(asignacion: AsignacionTaller): void {
    this.asignacionParaCancelar = asignacion;
    this.motivoCancelacion = '';
    this.modalCancelarAbierto = true;
  }

  cerrarModalCancelar(): void {
    this.modalCancelarAbierto = false;
    this.asignacionParaCancelar = null;
    this.motivoCancelacion = '';
    this.cancelando = false;
  }

  confirmarCancelacion(): void {
    if (!this.asignacionParaCancelar?.incidente_id) return;
    this.cancelando = true;
    this.incidenteService.cancelarIncidenteTaller(
      this.asignacionParaCancelar.incidente_id,
      this.motivoCancelacion || undefined
    ).subscribe({
      next: () => {
        this.cerrarModalCancelar();
        this.cargarAsignaciones();
      },
      error: (err: any) => {
        this.cancelando = false;
        const msg = err?.error?.detail ?? 'Error al cancelar la emergencia';
        alert(`❌ ${msg}`);
      }
    });
  }

  puedeElTallerCancelar(estado: string | undefined): boolean {
    return ['pendiente', 'taller_asignado', 'en_camino', 'atencion'].includes(estado ?? '');
  }

  // ============================================================
  // CATÁLOGO DE SERVICIOS
  // ============================================================
  cargarCatalogoServicios(): void {
    this.tallerServiciosService.listar().subscribe({
      next: (data) => { this.catalogoServicios = data; },
      error: () => {},
    });
  }

  // ============================================================
  // MODAL COTIZAR
  // ============================================================
  abrirModalCotizar(asignacion: AsignacionTaller): void {
    this.asignacionParaCotizar = asignacion;
    this.serviciosSeleccionados = new Set();
    this.cotizarForm = {
      incidente_id: asignacion.incidente_id,
      items: [],
      tiempo_estimado_reparacion_horas: 0,
      notas: '',
    };
    this.formMontoTotal = 0;
    this.formTiempoMinutos = 0;
    this.modalCotizarAbierto = true;
  }

  cerrarModalCotizar(): void {
    this.modalCotizarAbierto = false;
    this.asignacionParaCotizar = null;
    this.serviciosSeleccionados = new Set();
  }

  toggleServicio(srv: TallerServicio): void {
    if (this.serviciosSeleccionados.has(srv.id)) {
      this.serviciosSeleccionados.delete(srv.id);
    } else {
      this.serviciosSeleccionados.add(srv.id);
    }
    // Recalcular monto sugerido
    let total = 0;
    let tiempo = 0;
    for (const id of this.serviciosSeleccionados) {
      const s = this.catalogoServicios.find(x => x.id === id);
      if (s) {
        total += s.precio_base ?? 0;
        tiempo += s.tiempo_estimado_minutos ?? 0;
      }
    }
    if (total > 0) { this.formMontoTotal = total; }
    if (tiempo > 0) { this.formTiempoMinutos = tiempo; }

    this.cotizarForm.items = this.catalogoServicios
      .filter(s => this.serviciosSeleccionados.has(s.id))
      .map(s => ({ nombre: s.nombre, precio: s.precio_base ?? 0 }));
  }

  enviarCotizacion(): void {
    if (!this.formMontoTotal || !this.formTiempoMinutos) {
      alert('Ingresa el monto total y el tiempo estimado de reparación');
      return;
    }
    this.cotizarForm.tiempo_estimado_reparacion_horas = this.formTiempoMinutos / 60;
    if (this.cotizarForm.items.length === 0) {
      this.cotizarForm.items = [{ nombre: 'Servicio de reparación', precio: this.formMontoTotal }];
    }
    this.enviandoCotizacion = true;
    this.cotizacionService.enviarCotizacion(this.cotizarForm).subscribe({
      next: () => {
        this.enviandoCotizacion = false;
        this.cerrarModalCotizar();
        alert('✅ Cotización enviada al cliente correctamente');
      },
      error: (err: any) => {
        this.enviandoCotizacion = false;
        const msg = err?.error?.detail ?? 'Error al enviar la cotización';
        alert(`❌ ${msg}`);
      },
    });
  }
}