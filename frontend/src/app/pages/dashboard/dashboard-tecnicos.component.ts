import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TecnicoService } from '../../services/tecnico.service';
import { TecnicoRespuesta } from '../../models/tipos';

@Component({
  selector: 'app-dashboard-tecnicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-tecnicos.component.html',
  styleUrl: './dashboard-tecnicos.component.scss',
})
export class DashboardTecnicosComponent implements OnInit {
  tecnicos: TecnicoRespuesta[] = [];
  busqueda = '';
  filtroEstado: 'todos' | 'disponible' | 'en-servicio' | 'fuera-linea' = 'todos';
  mostrarModalNuevoTecnico = false;

  readonly especialidadesDisponibles = [
    'Baterias',
    'Remolque',
    'Mecanica General',
    'Cerrajeria Vial',
    'Electricidad Automotriz',
  ];

  nombreTecnico = '';
  telefonoTecnico = '';
  especialidadTecnico = 'Mecanica General';
  guardando = false;

  tecnicoEditandoId: number | null = null;
  nombreEdit = '';
  telefonoEdit = '';
  especialidadEdit = '';

  mensaje = '';
  error = '';

  constructor(private tecnicoService: TecnicoService) {}

  ngOnInit(): void {
    this.tecnicoService.tecnicos$.subscribe((tecnicos: TecnicoRespuesta[]) => {
      this.tecnicos = tecnicos;
    });

    this.cargarTecnicos();
  }

  crearTecnico(): void {
    this.error = '';
    this.mensaje = '';

    // Validaciones
    if (!this.nombreTecnico.trim()) {
      this.error = 'El nombre es requerido.';
      return;
    }

    if (this.nombreTecnico.trim().length < 3) {
      this.error = 'El nombre debe tener al menos 3 caracteres.';
      return;
    }

    if (this.telefonoTecnico && !this.validarTelefono(this.telefonoTecnico)) {
      this.error = 'El formato del teléfono no es válido. Usa: +XXX XXXXXXXXX';
      return;
    }

    this.guardando = true;

    this.tecnicoService
      .crearTecnico(this.nombreTecnico.trim(), this.telefonoTecnico?.trim() || undefined, this.especialidadTecnico || undefined)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.nombreTecnico = '';
          this.telefonoTecnico = '';
          this.especialidadTecnico = 'Mecanica General';
          this.mensaje = '✓ Técnico registrado exitosamente';
          this.mostrarModalNuevoTecnico = false;
          setTimeout(() => {
            this.mensaje = '';
          }, 4000);
        },
        error: () => {
          this.guardando = false;
          this.error = 'No se pudo crear el técnico. Intenta nuevamente.';
        },
      });
  }

  validarTelefono(telefono: string): boolean {
    const regex = /^\+?\d{1,3}\s?\d{7,13}$/;
    return regex.test(telefono.replace(/[\s-()]/g, ''));
  }

  iniciarEdicion(tecnico: TecnicoRespuesta): void {
    this.tecnicoEditandoId = tecnico.id;
    this.nombreEdit = tecnico.nombre_completo;
    this.telefonoEdit = tecnico.telefono || '';
    this.especialidadEdit = tecnico.especialidad || '';
    this.error = '';
    this.mensaje = '';
  }

  cancelarEdicion(): void {
    this.tecnicoEditandoId = null;
    this.nombreEdit = '';
    this.telefonoEdit = '';
    this.especialidadEdit = '';
  }

  guardarEdicion(): void {
    if (!this.tecnicoEditandoId || !this.nombreEdit.trim()) {
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.tecnicoService
      .actualizarTecnico(this.tecnicoEditandoId, {
        nombre_completo: this.nombreEdit.trim(),
        telefono: this.telefonoEdit.trim() || null,
        especialidad: this.especialidadEdit.trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mensaje = 'Tecnico actualizado correctamente.';
          this.cancelarEdicion();
        },
        error: () => {
          this.guardando = false;
          this.error = 'No se pudo actualizar el tecnico.';
        },
      });
  }

  cambiarDisponibilidad(tecnico: TecnicoRespuesta): void {
    this.tecnicoService.cambiarDisponibilidad(tecnico.id, !tecnico.disponible).subscribe();
  }

  cambiarEstadoActivo(tecnico: TecnicoRespuesta): void {
    this.tecnicoService.actualizarTecnico(tecnico.id, { activo: !tecnico.activo }).subscribe({
      next: () => {
        this.mensaje = tecnico.activo ? 'Tecnico desactivado.' : 'Tecnico reactivado.';
      },
      error: () => {
        this.error = 'No se pudo cambiar el estado del tecnico.';
      },
    });
  }

  eliminarTecnico(tecnico: TecnicoRespuesta): void {
    const ok = confirm(`Estas seguro de eliminar a ${tecnico.nombre_completo}?`);
    if (!ok) {
      return;
    }

    this.tecnicoService.eliminarTecnico(tecnico.id).subscribe({
      next: () => {
        this.mensaje = 'Tecnico eliminado correctamente.';
      },
      error: () => {
        this.error = 'No se pudo eliminar el tecnico.';
      },
    });
  }

  cantidadDisponibles(): number {
    return this.tecnicos.filter((t) => t.disponible && t.activo).length;
  }

  cantidadEnServicio(): number {
    return this.tecnicos.filter((t) => t.activo && !t.disponible).length;
  }

  cantidadFueraLinea(): number {
    return this.tecnicos.filter((t) => !t.activo).length;
  }

  cambiarFiltro(filtro: 'todos' | 'disponible' | 'en-servicio' | 'fuera-linea'): void {
    this.filtroEstado = filtro;
  }

  abrirModalNuevoTecnico(): void {
    this.error = '';
    this.mensaje = '';
    this.mostrarModalNuevoTecnico = true;
  }

  cerrarModalNuevoTecnico(): void {
    this.mostrarModalNuevoTecnico = false;
  }

  tecnicosFiltrados(): TecnicoRespuesta[] {
    const termino = this.busqueda.trim().toLowerCase();

    return this.tecnicos.filter((tecnico) => {
      const coincideBusqueda =
        !termino ||
        tecnico.nombre_completo.toLowerCase().includes(termino) ||
        (tecnico.especialidad || '').toLowerCase().includes(termino) ||
        (tecnico.telefono || '').toLowerCase().includes(termino);

      const coincideFiltro =
        this.filtroEstado === 'todos' ||
        (this.filtroEstado === 'disponible' && tecnico.activo && tecnico.disponible) ||
        (this.filtroEstado === 'en-servicio' && tecnico.activo && !tecnico.disponible) ||
        (this.filtroEstado === 'fuera-linea' && !tecnico.activo);

      return coincideBusqueda && coincideFiltro;
    });
  }

  estadoOperativo(tecnico: TecnicoRespuesta): 'Disponible' | 'En servicio' | 'Fuera de linea' {
    if (!tecnico.activo) {
      return 'Fuera de linea';
    }
    if (tecnico.disponible) {
      return 'Disponible';
    }
    return 'En servicio';
  }

  claseEstado(tecnico: TecnicoRespuesta): string {
    const estado = this.estadoOperativo(tecnico);
    if (estado === 'Disponible') {
      return 'estado-disponible';
    }
    if (estado === 'En servicio') {
      return 'estado-servicio';
    }
    return 'estado-fuera-linea';
  }

  obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ').filter(Boolean);
    if (partes.length === 0) {
      return 'TC';
    }
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  private cargarTecnicos(): void {
    this.tecnicoService.obtenerTecnicos().subscribe({
      error: () => {
        this.error = 'No se pudieron cargar los tecnicos.';
      },
    });
  }
}
