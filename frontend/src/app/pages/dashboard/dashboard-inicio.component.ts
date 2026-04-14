import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TecnicoService } from '../../services/tecnico.service';
import { TallerRespuesta, TecnicoRespuesta, IncidentePanel, IndicadorPanel, Prioridad } from '../../models/tipos';

@Component({
  selector: 'app-dashboard-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-inicio.component.html',
  styleUrl: './dashboard-inicio.component.scss',
})
export class DashboardInicioComponent implements OnInit {
  tallerActual: TallerRespuesta | null = null;
  tecnicos: TecnicoRespuesta[] = [];

  readonly indicadores: IndicadorPanel[] = [
    {
      titulo: 'Solicitudes Pendientes',
      valor: '12',
      subtitulo: '+3 hoy',
      icono: 'pending_actions',
      color: 'danger',
    },
    {
      titulo: 'Tecnicos Activos',
      valor: '00',
      subtitulo: '0 registrados',
      icono: 'engineering',
      color: 'primary',
    },
    {
      titulo: 'Tiempo Medio Respuesta',
      valor: '18 min',
      subtitulo: 'Objetivo < 25 min',
      icono: 'timer',
      color: 'accent',
    },
  ];

  readonly incidentes: IncidentePanel[] = [
    {
      cliente: 'Ricardo Casares',
      vehiculo: 'Toyota Camry - BKS 293',
      tipo: 'Fallo Electrico',
      prioridad: 'alta',
      espera: '4m 12s',
    },
    {
      cliente: 'Maria Lopez',
      vehiculo: 'Honda Civic - JPR 110',
      tipo: 'Pinchazo',
      prioridad: 'media',
      espera: '12m 45s',
    },
    {
      cliente: 'Andres Silva',
      vehiculo: 'VW Golf - KKM 404',
      tipo: 'Colision Leve',
      prioridad: 'alta',
      espera: '21m 05s',
    },
  ];

  constructor(
    private authService: AuthService,
    private tecnicoService: TecnicoService,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller: TallerRespuesta | null) => {
      this.tallerActual = taller;
      if (taller) {
        this.cargarTecnicos();
      }
    });

    this.tecnicoService.tecnicos$.subscribe((tecnicos: TecnicoRespuesta[]) => {
      this.tecnicos = tecnicos;
      this.actualizarIndicadoresTecnicos();
    });
  }

  prioridadClase(prioridad: Prioridad): string {
    if (prioridad === 'alta') {
      return 'badge-prioridad-alta';
    }
    if (prioridad === 'media') {
      return 'badge-prioridad-media';
    }
    return 'badge-prioridad-baja';
  }

  prioridadTexto(prioridad: Prioridad): string {
    return prioridad.toUpperCase();
  }

  cantidadTecnicosDisponibles(): number {
    return this.tecnicoService.cantidadDisponibles();
  }

  private cargarTecnicos(): void {
    this.tecnicoService.obtenerTecnicos().subscribe();
  }

  private actualizarIndicadoresTecnicos(): void {
    const activos = this.cantidadTecnicosDisponibles();
    this.indicadores[1].valor = activos.toString().padStart(2, '0');
    this.indicadores[1].subtitulo = `${this.tecnicos.length} registrados`;
  }
}
