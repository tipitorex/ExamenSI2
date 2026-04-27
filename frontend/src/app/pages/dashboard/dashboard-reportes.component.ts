// src/app/pages/dashboard/dashboard-reportes.component.ts (versión actualizada)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, PieController, ArcElement, Legend, Tooltip, ChartConfiguration, ChartData } from 'chart.js';
import { Subscription, forkJoin } from 'rxjs';

import { ReporteService, ResumenDashboard, IngresosMensuales, IncidentesPorClasificacion, ServicioFacturado, TopTecnico, Tendencias } from '../../services/reporte.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { AuthService } from '../../services/auth.service';

// Registrar los componentes de Chart.js
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  ArcElement,
  Legend,
  Tooltip
);

@Component({
  selector: 'app-dashboard-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard-reportes.component.html',
  styleUrls: ['./dashboard-reportes.component.scss'],
})
export class DashboardReportesComponent implements OnInit, OnDestroy {
  // Datos del dashboard
  resumen: ResumenDashboard | null = null;
  tendencias: Tendencias | null = null;
  topTecnicos: TopTecnico[] = [];
  servicios: ServicioFacturado[] = [];
  totalServicios = 0;
  
  // Filtros
  filtroMeses = 6;
  filtroEstadoFactura = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  
  // Paginación
  paginaActual = 0;
  itemsPorPagina = 10;
  
  // Loading states
  isLoading = true;
  isExporting = false;
  fechaActual = new Date();
  nombreTaller = '';
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  // Configuración gráfica de barras
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Facturado',
        data: [],
        backgroundColor: '#005ea4',
        borderRadius: 8,
      },
      {
        label: 'Comisión (10%)',
        data: [],
        backgroundColor: '#ba1a1a',
        borderRadius: 8,
      },
      {
        label: 'Neto Taller',
        data: [],
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
    ],
  };
  
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.raw as number;
            label += '$' + value.toLocaleString();
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#e2e2e2' },
        ticks: {
          callback: (value: any) => '$' + value.toLocaleString(),
          font: { family: 'Inter', size: 11 },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Inter', size: 11 },
        },
      },
    },
  };
  
  // Configuración gráfica de pastel
  pieChartData: ChartData<'pie', number[], string> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderWidth: 0,
      },
    ],
  };
  
  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { family: 'Inter', size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };
  
  constructor(
    private reporteService: ReporteService,
    private pdfExportService: PdfExportService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    const taller = this.authService.obtenerTallerActual();
    this.nombreTaller = taller?.nombre || 'Guardian Pulse';
    this.cargarTodosLosDatos();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  cargarTodosLosDatos(): void {
    this.isLoading = true;
    
    const resumen$ = this.reporteService.obtenerResumenDashboard();
    const ingresos$ = this.reporteService.obtenerIngresosMensuales(this.filtroMeses);
    const clasificacion$ = this.reporteService.obtenerIncidentesPorClasificacion(
      this.filtroFechaInicio || undefined,
      this.filtroFechaFin || undefined
    );
    const topTecnicos$ = this.reporteService.obtenerTopTecnicos(this.filtroMeses);
    const tendencias$ = this.reporteService.obtenerTendencias();
    const servicios$ = this.reporteService.obtenerServiciosFacturados(
      this.paginaActual * this.itemsPorPagina,
      this.itemsPorPagina,
      this.filtroEstadoFactura || undefined,
      this.filtroFechaInicio || undefined,
      this.filtroFechaFin || undefined
    );
    
    const sub = forkJoin({
      resumen: resumen$,
      ingresos: ingresos$,
      clasificacion: clasificacion$,
      topTecnicos: topTecnicos$,
      tendencias: tendencias$,
      servicios: servicios$,
    }).subscribe({
      next: (result) => {
        this.resumen = result.resumen;
        this.tendencias = result.tendencias;
        this.topTecnicos = result.topTecnicos.tecnicos;
        this.totalServicios = result.servicios.total;
        this.servicios = result.servicios.servicios;
        
        this.actualizarGraficaBarras(result.ingresos);
        this.actualizarGraficaPastel(result.clasificacion);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.isLoading = false;
      },
    });
    
    this.subscriptions.push(sub);
  }
  
  actualizarGraficaBarras(datos: IngresosMensuales): void {
    this.barChartData.labels = datos.labels;
    this.barChartData.datasets[0].data = datos.datasets.facturado;
    this.barChartData.datasets[1].data = datos.datasets.comisiones;
    this.barChartData.datasets[2].data = datos.datasets.neto;
    this.barChartData = { ...this.barChartData };
  }
  
  actualizarGraficaPastel(datos: IncidentesPorClasificacion): void {
    const nombres: Record<string, string> = {
      bateria: 'Batería',
      llanta: 'Llanta',
      choque: 'Choque',
      motor: 'Motor',
      llave: 'Llave',
      grua: 'Grúa',
      incierto: 'Incierto',
    };
    
    this.pieChartData.labels = datos.datos.map(d => nombres[d.clasificacion] || d.clasificacion);
    this.pieChartData.datasets[0].data = datos.datos.map(d => d.cantidad);
    this.pieChartData.datasets[0].backgroundColor = datos.datos.map(d => d.color);
    this.pieChartData = { ...this.pieChartData };
  }
  
  aplicarFiltros(): void {
    this.paginaActual = 0;
    this.cargarTodosLosDatos();
  }
  
  cambiarPagina(delta: number): void {
    this.paginaActual += delta;
    this.cargarTodosLosDatos();
  }
  
  async exportarPDF(): Promise<void> {
    this.isExporting = true;
    const nombreArchivo = `reporte-${this.nombreTaller.toLowerCase().replace(/\s/g, '-')}-${this.fechaActual.toISOString().split('T')[0]}.pdf`;
    await this.pdfExportService.exportarReporte('reporte-pdf-content', nombreArchivo);
    this.isExporting = false;
  }
  
  get totalPaginas(): number {
    return Math.ceil(this.totalServicios / this.itemsPorPagina);
  }
  
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor);
  }
  
  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  }
  
  formatearFechaLarga(fecha: Date): string {
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  obtenerBadgeEstado(estado: string): string {
    const badges: Record<string, string> = {
      pagada: 'bg-green-100 text-green-800',
      pendiente: 'bg-yellow-100 text-yellow-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  }
  
  obtenerIconoTendencia(cambio: number): string {
    if (cambio > 0) return '↑';
    if (cambio < 0) return '↓';
    return '→';
  }
  
  obtenerColorTendencia(cambio: number): string {
    if (cambio > 0) return 'text-green-600';
    if (cambio < 0) return 'text-red-600';
    return 'text-gray-500';
  }
  
  obtenerColorCard(tipo: string): string {
    const colores: Record<string, string> = {
      ingresos: 'from-blue-500 to-blue-600',
      neto: 'from-green-500 to-green-600',
      pendiente: 'from-yellow-500 to-yellow-600',
      incidentes: 'from-purple-500 to-purple-600',
    };
    return colores[tipo] || 'from-gray-500 to-gray-600';
  }
}