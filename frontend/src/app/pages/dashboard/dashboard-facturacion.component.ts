import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { IncidenteService } from '../../services/incidente.service';

interface ConceptoFactura {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface IncidentePorFacturar {
  id: number;
  cliente_nombre: string;
  cliente_email: string;
  vehiculo: string;
  placa: string;
  clasificacion_ia: string;
  fecha_atencion: string;
}

@Component({
  selector: 'app-dashboard-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-facturacion.component.html',
  styleUrl: './dashboard-facturacion.component.scss'
})
export class DashboardFacturacionComponent implements OnInit {
  
  tabActiva: 'porFacturar' | 'facturadas' = 'porFacturar';
  incidentesPorFacturar: IncidentePorFacturar[] = [];
  facturasEmitidas: any[] = [];
  loading = false;
  selectedIncidente: any = null;
  mostrarModalFactura = false;
  conceptos: ConceptoFactura[] = [{ concepto: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }];
  totalFactura = 0;
  comisionPlataforma = 0;
  montoNetoTaller = 0;
  generandoFactura = false;
  facturaSeleccionada: any = null;
  mostrarModalDetalle = false;

  constructor(
    private incidenteService: IncidenteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarIncidentesPorFacturar();
    this.cargarFacturasEmitidas();
  }

  cargarIncidentesPorFacturar(): void {
    this.loading = true;
    this.incidenteService.listarIncidentesAtendidosSinFacturar().subscribe({
      next: (data) => {
        this.incidentesPorFacturar = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando incidentes:', err);
        this.loading = false;
      }
    });
  }

  cargarFacturasEmitidas(): void {
    this.incidenteService.listarFacturasTaller().subscribe({
      next: (data) => {
        this.facturasEmitidas = data;
      },
      error: (err) => {
        console.error('Error cargando facturas:', err);
      }
    });
  }

  abrirModalFactura(incidente: any): void {
    this.selectedIncidente = incidente;
    this.conceptos = [{ concepto: 'Mano de obra', cantidad: 1, precio_unitario: 0, subtotal: 0 }];
    this.calcularTotales();
    this.mostrarModalFactura = true;
  }

  cerrarModalFactura(): void {
    this.mostrarModalFactura = false;
    this.selectedIncidente = null;
  }

  agregarConcepto(): void {
    this.conceptos.push({ concepto: '', cantidad: 1, precio_unitario: 0, subtotal: 0 });
  }

  eliminarConcepto(index: number): void {
    if (this.conceptos.length > 1) {
      this.conceptos.splice(index, 1);
      this.calcularTotales();
    }
  }

  actualizarSubtotal(index: number): void {
    const concepto = this.conceptos[index];
    concepto.subtotal = concepto.cantidad * concepto.precio_unitario;
    this.calcularTotales();
  }

  calcularTotales(): void {
    this.totalFactura = this.conceptos.reduce((sum, c) => sum + c.subtotal, 0);
    this.comisionPlataforma = this.totalFactura * 0.10;
    this.montoNetoTaller = this.totalFactura * 0.90;
  }

  generarFactura(): void {
    const conceptosValidos = this.conceptos.filter(c => 
      c.concepto.trim() && c.cantidad > 0 && c.precio_unitario > 0
    );
    
    if (conceptosValidos.length === 0) {
      alert('Agrega al menos un concepto válido');
      return;
    }
    
    this.generandoFactura = true;
    
    const payload = {
      incidente_id: this.selectedIncidente.id,
      conceptos: conceptosValidos.map(c => ({
        concepto: c.concepto,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario
      })),
      notas_internas: `Factura generada automáticamente para ${this.selectedIncidente.cliente_nombre}`
    };
    
    this.incidenteService.crearFactura(payload).subscribe({
      next: (factura) => {
        this.generandoFactura = false;
        this.cerrarModalFactura();
        alert(`✅ Factura ${factura.numero_factura} generada exitosamente\nTotal: $${factura.total}`);
        this.cargarIncidentesPorFacturar();
        this.cargarFacturasEmitidas();
      },
      error: (err) => {
        this.generandoFactura = false;
        console.error('Error:', err);
        alert('Error al generar la factura: ' + (err.error?.detail || 'Intenta nuevamente'));
      }
    });
  }

  verDetalleFactura(factura: any): void {
    console.log('🔍 Navegando a factura:', factura.id);
    this.router.navigate(['/dashboard/factura', factura.id]);
  }

  copiarLinkPago(url: string): void {
    navigator.clipboard.writeText(url);
    alert('Link de pago copiado al portapapeles');
  }

  cambiarTab(tab: 'porFacturar' | 'facturadas'): void {
    this.tabActiva = tab;
  }
}