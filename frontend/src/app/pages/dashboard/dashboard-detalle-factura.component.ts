import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IncidenteService } from '../../services/incidente.service';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-dashboard-detalle-factura',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-detalle-factura.component.html',
  styleUrl: './dashboard-detalle-factura.component.scss'
})
export class DashboardDetalleFacturaComponent implements OnInit {
  factura: any = null;
  cargando = true;
  error = false;
  descargandoPDF = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidenteService: IncidenteService,
    private pdfExportService: PdfExportService  // ← Inyectar el servicio
  ) {}

  ngOnInit(): void {
    const facturaId = this.route.snapshot.paramMap.get('id');
    if (facturaId) {
      this.cargarFactura(parseInt(facturaId));
    } else {
      this.error = true;
      this.cargando = false;
    }
  }

  cargarFactura(id: number): void {
    this.cargando = true;
    this.incidenteService.obtenerFacturaDetalle(id).subscribe({
      next: (data) => {
        this.factura = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando factura:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/dashboard/facturacion']);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ============================================================
  // DESCARGAR FACTURA EN PDF (usando el servicio)
  // ============================================================
  async descargarPDF(): Promise<void> {
    if (!this.factura) return;
    
    this.descargandoPDF = true;
    
    try {
      const nombreArchivo = `factura-${this.factura.numero_factura || this.factura.id}.pdf`;
      await this.pdfExportService.exportarReporte('factura-print-content', nombreArchivo);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el PDF');
    } finally {
      this.descargandoPDF = false;
    }
  }
}