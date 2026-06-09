import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { IncidenteService, IncidenteCompleto } from '../../services/incidente.service';
import { AsignacionService, AsignacionTaller } from '../../services/asignacion.service';
import { CotizacionService, CotizacionCrear } from '../../services/cotizacion.service';
import { TallerServiciosService, TallerServicio } from '../../services/taller-servicios.service';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { Evidencia } from '../../models/tipos';
import { ModalSeleccionTecnicoComponent } from '../../components/modal-seleccion-tecnico/modal-seleccion-tecnico.component';

interface ItemFormulario {
  nombre: string;
  precio: number | null;
  tiempoMinutos?: number;
}

@Component({
  selector: 'app-dashboard-detalle-emergencia',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalSeleccionTecnicoComponent],
  templateUrl: './dashboard-detalle-emergencia.component.html',
  styleUrl: './dashboard-detalle-emergencia.component.scss',
})
export class DashboardDetalleEmergenciaComponent implements OnInit, AfterViewInit, OnDestroy {
  incidenteId: number | null = null;
  incidenteCompleto: IncidenteCompleto | null = null;
  asignacion: AsignacionTaller | null = null;
  cargando = true;
  error = false;

  // Modal cambio de estado
  modalEstadoAbierto = false;
  nuevoEstado = '';
  cambiandoEstado = false;

  // Modal asignar técnico
  mostrarModalTecnico = false;

  // ============================================================
  // PANEL DE COTIZACIÓN (multi-ítem + horas)
  // ============================================================
  modalCotizarAbierto = false;
  enviandoCotizacion = false;
  catalogoServicios: TallerServicio[] = [];
  cotizarItems: ItemFormulario[] = [{ nombre: '', precio: null }];
  cotizarHoras: number | null = null;
  cotizarNotas = '';

  private map: L.Map | null = null;
  private mapaInicializado = false;
  private wsSub: Subscription | null = null;
  private tecnicoMarker: L.Marker | null = null;

  // Notificación de cambio de estado en tiempo real
  alertaWs: string | null = null;
  private alertaTimeout: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidenteService: IncidenteService,
    private asignacionService: AsignacionService,
    private cotizacionService: CotizacionService,
    private tallerServiciosService: TallerServiciosService,
    private authService: AuthService,
    private websocketService: WebsocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.incidenteId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.incidenteId) {
      this.cargarDatos();
      this.cargarCatalogo();
      this._conectarWebSocket();
    } else {
      this.error = true;
      this.cargando = false;
    }
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.websocketService.disconnect();
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private _conectarWebSocket(): void {
    this.websocketService.connect(this.incidenteId!);
    this.wsSub = this.websocketService.messages$.subscribe(msg => {
      if (!msg) return;

      if (msg.tipo === 'estado_incidente' && msg.data?.incidente_id === this.incidenteId) {
        const estado = msg.data.estado as string;
        this._mostrarAlerta(`Estado actualizado: ${this.getEstadoTexto(estado)}`);
        this.mapaInicializado = false;
        this.cargarDatos();
      }

      if (msg.tipo === 'cotizacion_aceptada' && msg.data?.incidente_id === this.incidenteId) {
        this._mostrarAlerta('✅ ¡El cliente aceptó tu cotización! Asigna un técnico para continuar.');
        this.cargarDatos();
      }

      if (msg.tipo === 'ubicacion_tecnico' && msg.data?.incidente_id === this.incidenteId) {
        const lat = msg.data.latitud as number;
        const lng = msg.data.longitud as number;
        this._actualizarMarkerTecnico(lat, lng, msg.data.tecnico_nombre ?? 'Técnico');
      }
    });
  }

  private _mostrarAlerta(texto: string): void {
    this.alertaWs = texto;
    this.cdr.detectChanges();
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    this.alertaTimeout = setTimeout(() => {
      this.alertaWs = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  private _actualizarMarkerTecnico(lat: number, lng: number, nombre: string): void {
    if (!this.map) return;
    const tecnicoIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: 'tecnico-marker',
    });
    if (this.tecnicoMarker) {
      this.tecnicoMarker.setLatLng([lat, lng]);
    } else {
      this.tecnicoMarker = L.marker([lat, lng], { icon: tecnicoIcon })
        .addTo(this.map)
        .bindPopup(`🔧 ${nombre}`);
    }
  }

  cargarDatos(): void {
    this.cargando = true;
    this.incidenteService.obtenerIncidente(this.incidenteId!).subscribe({
      next: (incidente) => {
        this.incidenteCompleto = incidente;
        this.cdr.detectChanges();
        this.cargarAsignacion();
        setTimeout(() => this.initMap(), 200);
      },
      error: () => { this.error = true; this.cargando = false; },
    });
  }

  cargarAsignacion(): void {
    this.asignacionService.listarAsignaciones().subscribe({
      next: (asignaciones) => {
        this.asignacion = asignaciones.find(a => a.incidente_id === this.incidenteId) || null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; },
    });
  }

  cargarCatalogo(): void {
    this.tallerServiciosService.listar().subscribe({
      next: (data) => { this.catalogoServicios = data; },
      error: () => {},
    });
  }

  initMap(): void {
    const lat = this.incidenteCompleto?.latitud;
    const lng = this.incidenteCompleto?.longitud;
    if (!lat || !lng) return;

    const mapContainer = document.getElementById('incidente-mapa');
    if (!mapContainer) { setTimeout(() => this.initMap(), 300); return; }
    if (this.mapaInicializado) return;
    if (this.map) { this.map.remove(); }

    this.map = L.map('incidente-mapa').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([lat, lng], { icon }).addTo(this.map).bindPopup('Ubicación del incidente').openPopup();
    this.mapaInicializado = true;
  }

  // ============================================================
  // ESTADOS
  // ============================================================
  get estadoActual(): string {
    return this.incidenteCompleto?.estado || 'pendiente';
  }

  private get estadosFinal(): string[] {
    return ['en_camino', 'en_atencion', 'en_proceso', 'atendido', 'finalizado', 'cancelado'];
  }

  get puedeCotizar(): boolean {
    // Mostrar si la asignación no fue aceptada aún y el incidente no está en etapa activa/final
    if (this.estaFinalizado) return false;
    if (this.asignacion?.es_aceptado) return false;
    return !this.estadosFinal.includes(this.estadoActual);
  }

  get puedeAsignarTecnico(): boolean {
    // Mostrar cuando la cotización fue aceptada por el cliente y no hay técnico aún
    if (this.estaFinalizado) return false;
    if (!this.asignacion?.es_aceptado) return false;
    if (this.asignacion?.tecnico_id) return false;
    return !['en_camino', 'en_atencion', 'en_proceso', 'atendido'].includes(this.estadoActual);
  }

  get puedeVerTracking(): boolean {
    return !!this.asignacion?.es_aceptado && !this.estaFinalizado;
  }

  get puedeMarcarEnCamino(): boolean {
    if (!this.asignacion?.es_aceptado) return false;
    return ['pendiente', 'taller_asignado'].includes(this.estadoActual);
  }

  get puedeMarcarEnAtencion(): boolean {
    if (!this.asignacion?.es_aceptado) return false;
    return this.estadoActual === 'en_camino';
  }

  get puedeMarcarFinalizado(): boolean {
    if (!this.asignacion?.es_aceptado) return false;
    return ['en_atencion', 'en_proceso'].includes(this.estadoActual);
  }

  get estaFinalizado(): boolean {
    return ['finalizado', 'atendido', 'cancelado'].includes(this.estadoActual);
  }

  // ============================================================
  // COTIZACIÓN MULTI-ÍTEM
  // ============================================================
  abrirModalCotizar(): void {
    this.cotizarItems = [{ nombre: '', precio: null }];
    this.cotizarHoras = null;
    this.cotizarNotas = '';
    this.modalCotizarAbierto = true;
  }

  cerrarModalCotizar(): void {
    this.modalCotizarAbierto = false;
  }

  agregarItemDesdevCatalogo(srv: TallerServicio): void {
    const yaExiste = this.cotizarItems.some(i => i.nombre === srv.nombre);
    if (!yaExiste) {
      const idx = this.cotizarItems.findIndex(i => !i.nombre.trim());
      const item: ItemFormulario = {
        nombre: srv.nombre,
        precio: srv.precio_base ?? null,
        tiempoMinutos: srv.tiempo_estimado_minutos ?? undefined,
      };
      if (idx !== -1) {
        this.cotizarItems[idx] = item;
      } else {
        this.cotizarItems.push(item);
      }
      this._recalcularHoras();
    }
  }

  private _recalcularHoras(): void {
    const totalMin = this.cotizarItems.reduce((s, i) => s + (i.tiempoMinutos || 0), 0);
    if (totalMin > 0) {
      this.cotizarHoras = parseFloat((totalMin / 60).toFixed(2));
    }
  }

  agregarItem(): void {
    this.cotizarItems.push({ nombre: '', precio: null });
  }

  eliminarItem(index: number): void {
    if (this.cotizarItems.length > 1) {
      this.cotizarItems.splice(index, 1);
      this._recalcularHoras();
    }
  }

  get montoTotal(): number {
    return this.cotizarItems.reduce((s, i) => s + (i.precio || 0), 0);
  }

  enviarCotizacion(): void {
    const itemsValidos = this.cotizarItems.filter(i => i.nombre.trim() && i.precio && i.precio > 0);
    if (itemsValidos.length === 0) { alert('Agrega al menos un servicio con nombre y precio'); return; }
    if (!this.cotizarHoras || this.cotizarHoras <= 0) { alert('Ingresa el tiempo estimado en horas'); return; }

    this.enviandoCotizacion = true;
    const payload: CotizacionCrear = {
      incidente_id: this.incidenteId!,
      items: itemsValidos.map(i => ({ nombre: i.nombre.trim(), precio: i.precio! })),
      tiempo_estimado_reparacion_horas: this.cotizarHoras,
      notas: this.cotizarNotas.trim() || undefined,
    };

    this.cotizacionService.enviarCotizacion(payload).subscribe({
      next: () => {
        this.enviandoCotizacion = false;
        this.cerrarModalCotizar();
        alert('✅ Cotización enviada al cliente');
        this.cargarDatos();
      },
      error: (err: any) => {
        this.enviandoCotizacion = false;
        alert(`❌ ${err?.error?.detail ?? 'Error al enviar cotización'}`);
      },
    });
  }

  // ============================================================
  // ASIGNAR TÉCNICO
  // ============================================================
  abrirModalTecnico(): void { this.mostrarModalTecnico = true; }
  cerrarModalTecnico(): void { this.mostrarModalTecnico = false; }
  onTecnicoAsignado(): void {
    this.cerrarModalTecnico();
    this.cargarDatos();
    alert('✅ Técnico asignado correctamente');
  }

  // ============================================================
  // TRACKING
  // ============================================================
  irATracking(): void {
    if (this.incidenteId) {
      this.router.navigate(['/dashboard/tracking', this.incidenteId]);
    }
  }

  // ============================================================
  // CAMBIO DE ESTADO
  // ============================================================
  cambiarEstado(nuevoEstado: string): void {
    this.nuevoEstado = nuevoEstado;
    this.modalEstadoAbierto = true;
  }

  confirmarCambioEstado(): void {
    if (!this.asignacion) return;
    this.cambiandoEstado = true;

    this.asignacionService.actualizarEstadoIncidente(this.asignacion.id, { estado: this.nuevoEstado }).subscribe({
      next: () => {
        this.cambiandoEstado = false;
        this.modalEstadoAbierto = false;
        this.mapaInicializado = false;
        this.cargarDatos();
      },
      error: (err: any) => {
        this.cambiandoEstado = false;
        alert(`Error: ${err?.error?.detail ?? 'No se pudo actualizar el estado'}`);
      },
    });
  }

  cerrarModalEstado(): void {
    this.modalEstadoAbierto = false;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  get imagenesEvidencias(): Evidencia[] {
    return (this.incidenteCompleto?.evidencias ?? []).filter(e => e.tipo?.toLowerCase() === 'imagen');
  }

  obtenerUrlImagen(url: string): string {
    if (!url) return '';
    return url.startsWith('media/') ? `http://localhost:8000/${url}` : url;
  }

  abrirImagen(url: string): void { window.open(this.obtenerUrlImagen(url), '_blank'); }

  abrirGoogleMaps(lat?: number, lng?: number): void {
    if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  volverAlDashboard(): void { this.router.navigate(['/dashboard/emergencias-activas']); }

  getPrioridadClass(p: string): string {
    return { alta: 'priority-high', media: 'priority-medium', baja: 'priority-low' }[p] ?? 'priority-medium';
  }

  getPrioridadTexto(p: string): string {
    return { alta: 'Alta Prioridad', media: 'Media Prioridad', baja: 'Baja Prioridad' }[p] ?? p;
  }

  getEstadoClass(e: string): string {
    const m: Record<string, string> = {
      pendiente: 'status-pending', taller_asignado: 'status-assigned',
      en_camino: 'status-progress', en_proceso: 'status-progress',
      en_atencion: 'status-attention', atendido: 'status-done',
      finalizado: 'status-done', cancelado: 'status-cancelled',
    };
    return m[e] ?? 'status-pending';
  }

  getEstadoTexto(e: string): string {
    const m: Record<string, string> = {
      pendiente: 'Pendiente', taller_asignado: 'Taller Asignado',
      en_camino: 'En Camino', en_proceso: 'En Proceso',
      en_atencion: 'En Atención', atendido: 'Atendido',
      finalizado: 'Finalizado', cancelado: 'Cancelado',
    };
    return m[e] ?? e;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
    return d.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getEstadoBotonTexto(estado: string): string {
    return { en_camino: 'En Camino', en_atencion: 'En Atención', finalizado: 'Finalizado' }[estado] ?? estado;
  }

  trackByIndex(index: number): number { return index; }
}
