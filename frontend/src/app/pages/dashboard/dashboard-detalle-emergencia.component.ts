import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { IncidenteService, IncidenteCompleto } from '../../services/incidente.service';
import { AsignacionService, AsignacionTaller } from '../../services/asignacion.service';
import { AuthService } from '../../services/auth.service';
import { Evidencia } from '../../models/tipos';

@Component({
  selector: 'app-dashboard-detalle-emergencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-detalle-emergencia.component.html',
  styleUrl: './dashboard-detalle-emergencia.component.scss'
})
export class DashboardDetalleEmergenciaComponent implements OnInit, AfterViewInit {
  incidenteId: number | null = null;
  incidenteCompleto: IncidenteCompleto | null = null;
  asignacion: AsignacionTaller | null = null;
  cargando = true;
  error = false;
  
  // Modal para cambio de estado
  modalEstadoAbierto = false;
  nuevoEstado = '';
  
  private map: L.Map | null = null;
  private mapaInicializado = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidenteService: IncidenteService,
    private asignacionService: AsignacionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.incidenteId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.incidenteId) {
      this.cargarDatos();
    } else {
      this.error = true;
      this.cargando = false;
    }
  }

  ngAfterViewInit(): void {
    // El mapa se inicializará después de cargar los datos
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
      error: (err) => {
        console.error('Error cargando incidente:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  cargarAsignacion(): void {
    this.asignacionService.listarAsignaciones().subscribe({
      next: (asignaciones) => {
        this.asignacion = asignaciones.find(a => a.incidente_id === this.incidenteId) || null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando asignación:', err);
        this.cargando = false;
      }
    });
  }

  initMap(): void {
    const lat = this.incidenteCompleto?.latitud;
    const lng = this.incidenteCompleto?.longitud;
    
    if (!lat || !lng) {
      return;
    }
    
    const mapContainer = document.getElementById('incidente-mapa');
    if (!mapContainer) {
      setTimeout(() => this.initMap(), 300);
      return;
    }
    
    if (this.mapaInicializado) {
      return;
    }
    
    if (this.map) {
      this.map.remove();
    }
    
    this.map = L.map('incidente-mapa').setView([lat, lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    
    L.marker([lat, lng], { icon }).addTo(this.map)
      .bindPopup('Ubicación del incidente')
      .openPopup();
    
    this.mapaInicializado = true;
  }

  get imagenesEvidencias(): Evidencia[] {
    if (!this.incidenteCompleto?.evidencias) {
      return [];
    }
    return this.incidenteCompleto.evidencias.filter(e => e.tipo?.toLowerCase() === 'imagen');
  }

  obtenerUrlImagen(url: string): string {
    if (!url) return '';
    if (url.startsWith('media/')) {
      return `http://localhost:8000/${url}`;
    }
    return url;
  }

  abrirImagen(url: string): void {
    const urlCompleta = this.obtenerUrlImagen(url);
    window.open(urlCompleta, '_blank');
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

  abrirGoogleMaps(lat: number | undefined, lng: number | undefined): void {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  }

  cambiarEstado(asignacion: AsignacionTaller, nuevoEstado: string): void {
    this.asignacion = asignacion;
    this.nuevoEstado = nuevoEstado;
    this.modalEstadoAbierto = true;
  }

  confirmarCambioEstado(): void {
    if (!this.asignacion) return;

    this.asignacionService.actualizarEstadoIncidente(this.asignacion.id, { estado: this.nuevoEstado }).subscribe({
      next: () => {
        this.modalEstadoAbierto = false;
        this.mapaInicializado = false;
        this.cargarDatos();
      },
      error: (err: any) => {
        console.error('Error actualizando estado:', err);
        alert('Error al actualizar el estado');
      }
    });
  }

  cerrarModalEstado(): void {
    this.modalEstadoAbierto = false;
    this.asignacion = null;
  }

  volverAlDashboard(): void {
    this.router.navigate(['/dashboard/emergencias-activas']);
  }
}