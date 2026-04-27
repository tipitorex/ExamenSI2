import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TecnicoService, TecnicoDisponible, TecnicosDisponiblesResponse } from '../../services/tecnico.service';
import { AsignacionService } from '../../services/asignacion.service';

@Component({
  selector: 'app-modal-seleccion-tecnico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-seleccion-tecnico.component.html',
  styleUrls: ['./modal-seleccion-tecnico.component.scss']
})
export class ModalSeleccionTecnicoComponent implements OnInit {
  @Input() incidenteId!: number;
  @Input() incidenteLat!: number;
  @Input() incidenteLng!: number;
  @Input() clasificacionIa?: string | null;
  @Input() asignacionId!: number;
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() asignado = new EventEmitter<{ tecnicoId: number, tiempoEstimado: number | null }>();

  cargando = true;
  tecnicos: TecnicoDisponible[] = [];
  recomendadoId: number | null = null;
  tecnicoSeleccionadoId: number | null = null;
  tiempoEstimadoManual: number | null = null;
  error = '';

  constructor(
    private tecnicoService: TecnicoService,
    private asignacionService: AsignacionService
  ) {}

  ngOnInit(): void {
    this.cargarTecnicos();
  }

  cargarTecnicos(): void {
    this.cargando = true;
    this.error = '';
    
    this.tecnicoService.getTecnicosDisponiblesCercanos(
      this.incidenteLat,
      this.incidenteLng,
      this.clasificacionIa
    ).subscribe({
      next: (resp: TecnicosDisponiblesResponse) => {
        this.tecnicos = resp.tecnicos;
        this.recomendadoId = resp.recomendado_id;
        
        if (this.recomendadoId) {
          this.tecnicoSeleccionadoId = this.recomendadoId;
          const recomendado = this.tecnicos.find(t => t.id === this.recomendadoId);
          if (recomendado?.tiempo_estimado_minutos) {
            this.tiempoEstimadoManual = recomendado.tiempo_estimado_minutos;
          }
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando técnicos:', err);
        this.error = 'No se pudieron cargar los técnicos disponibles. Intente de nuevo.';
        this.cargando = false;
      }
    });
  }

  getTecnicoNombre(id: number): string {
    const t = this.tecnicos.find(t => t.id === id);
    return t?.nombre_completo || '';
  }

  getTecnicoEspecialidad(id: number): string {
    const t = this.tecnicos.find(t => t.id === id);
    return t?.especialidad || 'Mecánico general';
  }

  getTecnicoDistancia(id: number): string {
    const t = this.tecnicos.find(t => t.id === id);
    return t?.distancia_km?.toString() || '?';
  }

  getTecnicoTiempo(id: number): number | null {
    const t = this.tecnicos.find(t => t.id === id);
    return t?.tiempo_estimado_minutos || null;
  }

  seleccionarTecnico(id: number, tiempoEstimado?: number | null): void {
    this.tecnicoSeleccionadoId = id;
    if (tiempoEstimado) {
      this.tiempoEstimadoManual = tiempoEstimado;
    }
  }

  confirmarAsignacion(): void {
    if (!this.tecnicoSeleccionadoId) {
      this.error = 'Debe seleccionar un técnico';
      return;
    }
    
    this.asignacionService.aceptarConTecnico(
      this.asignacionId,
      this.tecnicoSeleccionadoId,
      this.tiempoEstimadoManual || undefined
    ).subscribe({
      next: (response) => {
        console.log('Asignación confirmada:', response);
        this.asignado.emit({
          tecnicoId: this.tecnicoSeleccionadoId!,
          tiempoEstimado: this.tiempoEstimadoManual
        });
      },
      error: (err) => {
        console.error('Error al asignar técnico:', err);
        this.error = err.error?.detail || 'Error al asignar el técnico. Intente de nuevo.';
      }
    });
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}