import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IncidenteService, HistorialIncidente } from '../../services/incidente.service';

@Component({
  selector: 'app-dashboard-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-historial.component.html',
  styleUrl: './dashboard-historial.component.scss',
})
export class DashboardHistorialComponent implements OnInit {
  incidentes: HistorialIncidente[] = [];
  loading = false;
  error = '';
  
  // Filtros
  filtroEstado = 'todos';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  
  // Paginación
  currentPage = 0;
  pageSize = 20;
  
  // Modal
  incidenteSeleccionado: HistorialIncidente | null = null;
  mostrarModal = false;

  estados = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'pendiente', label: 'Pendiente' },
    { valor: 'en_proceso', label: 'En Proceso' },
    { valor: 'atendido', label: 'Atendido' }
  ];

  constructor(private incidenteService: IncidenteService) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.loading = true;
    this.error = '';
    
    const filtros: any = {
      skip: this.currentPage * this.pageSize,
      limit: this.pageSize
    };
    
    if (this.filtroEstado !== 'todos') {
      filtros.estado = this.filtroEstado;
    }
    if (this.filtroFechaDesde) {
      filtros.fecha_desde = this.filtroFechaDesde;
    }
    if (this.filtroFechaHasta) {
      filtros.fecha_hasta = this.filtroFechaHasta;
    }
    
    this.incidenteService.listarHistorialTaller(filtros).subscribe({
      next: (data) => {
        this.incidentes = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando historial:', err);
        this.error = 'No se pudo cargar el historial';
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.currentPage = 0;
    this.cargarHistorial();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.aplicarFiltros();
  }

  paginaAnterior(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cargarHistorial();
    }
  }

  paginaSiguiente(): void {
    this.currentPage++;
    this.cargarHistorial();
  }

  verDetalle(incidente: HistorialIncidente): void {
    this.incidenteSeleccionado = incidente;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.incidenteSeleccionado = null;
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
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return prioridad;
    }
  }

  // ✅ CORREGIDO: ahora acepta null
  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}