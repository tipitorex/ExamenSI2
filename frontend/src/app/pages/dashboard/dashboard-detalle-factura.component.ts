import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IncidenteService } from '../../services/incidente.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidenteService: IncidenteService
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
}