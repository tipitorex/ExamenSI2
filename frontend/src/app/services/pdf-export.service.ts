// src/app/services/pdf-export.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  
  async exportarReporte(elementId: string, nombreArchivo: string = 'reporte-guardian-pulse.pdf'): Promise<void> {
    const elemento = document.getElementById(elementId);
    
    if (!elemento) {
      console.error(`Elemento con id "${elementId}" no encontrado`);
      return;
    }
    
    try {
      // Mostrar loading
      const loadingOverlay = this.mostrarLoading();
      
      // Configuración para mejor calidad
      const canvas = await html2canvas(elemento, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Agregar primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Agregar páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Guardar el PDF
      pdf.save(nombreArchivo);
      
      // Ocultar loading
      this.ocultarLoading(loadingOverlay);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.ocultarLoading();
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    }
  }
  
  private mostrarLoading(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'pdf-loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 1rem; text-align: center;">
        <div style="width: 50px; height: 50px; border: 4px solid #005ea4; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
        <p style="color: #1a1c1c; font-family: Inter, sans-serif;">Generando PDF...</p>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  private ocultarLoading(overlay?: HTMLElement): void {
    const loadingOverlay = overlay || document.getElementById('pdf-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}