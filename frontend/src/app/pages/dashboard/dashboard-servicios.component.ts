import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TallerServiciosService,
  TallerServicio,
  TallerServicioCrear,
} from '../../services/taller-servicios.service';

@Component({
  selector: 'app-dashboard-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-servicios.component.html',
  styleUrl: './dashboard-servicios.component.scss',
})
export class DashboardServiciosComponent implements OnInit {
  servicios: TallerServicio[] = [];
  loading = false;
  guardando = false;
  error = '';

  // Formulario para crear / editar
  modalAbierto = false;
  editando: TallerServicio | null = null;
  form: TallerServicioCrear = { nombre: '', descripcion: '', precio_base: undefined, tiempo_estimado_minutos: undefined };
  formTiempoHoras: number | undefined = undefined;

  constructor(private tallerServiciosService: TallerServiciosService) {}

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.loading = true;
    this.tallerServiciosService.listar().subscribe({
      next: (data) => { this.servicios = data; this.loading = false; },
      error: () => { this.error = 'Error al cargar servicios'; this.loading = false; },
    });
  }

  abrirModalNuevo(): void {
    this.editando = null;
    this.form = { nombre: '', descripcion: '', precio_base: undefined, tiempo_estimado_minutos: undefined };
    this.formTiempoHoras = undefined;
    this.modalAbierto = true;
  }

  abrirModalEditar(servicio: TallerServicio): void {
    this.editando = servicio;
    this.form = {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      precio_base: servicio.precio_base,
      tiempo_estimado_minutos: servicio.tiempo_estimado_minutos,
    };
    this.formTiempoHoras = servicio.tiempo_estimado_minutos
      ? parseFloat((servicio.tiempo_estimado_minutos / 60).toFixed(2))
      : undefined;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.editando = null;
  }

  guardar(): void {
    if (!this.form.nombre.trim()) { return; }
    this.guardando = true;

    const payload: TallerServicioCrear = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || undefined,
      precio_base: this.form.precio_base ? +this.form.precio_base : undefined,
      tiempo_estimado_minutos: this.formTiempoHoras ? Math.round(+this.formTiempoHoras * 60) : undefined,
    };

    const accion = this.editando
      ? this.tallerServiciosService.actualizar(this.editando.id, payload)
      : this.tallerServiciosService.crear(payload);

    accion.subscribe({
      next: () => { this.guardando = false; this.cerrarModal(); this.cargarServicios(); },
      error: () => { this.guardando = false; alert('Error al guardar el servicio'); },
    });
  }

  eliminar(servicio: TallerServicio): void {
    if (!confirm(`¿Eliminar el servicio "${servicio.nombre}"?`)) { return; }
    this.tallerServiciosService.eliminar(servicio.id).subscribe({
      next: () => this.cargarServicios(),
      error: () => alert('Error al eliminar el servicio'),
    });
  }

  formatTiempo(minutos?: number): string {
    if (!minutos) { return '—'; }
    if (minutos < 60) { return `${minutos} min`; }
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
}
