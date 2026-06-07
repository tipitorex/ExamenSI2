import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SuscripcionService, PlanInfo } from './suscripcion.service';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private planInfoSubject = new BehaviorSubject<PlanInfo | null>(null);
  public planInfo$ = this.planInfoSubject.asObservable();

  constructor(private suscripcionService: SuscripcionService) {
    this.cargarPlanInfo();
  }

  cargarPlanInfo(): void {
    this.suscripcionService.obtenerMiPlan().subscribe({
      next: (data) => {
        this.planInfoSubject.next(data);
      },
      error: (err) => {
        console.error('Error cargando plan:', err);
      }
    });
  }

  refrescarPlanInfo(): void {
    this.cargarPlanInfo();
  }

  getPlanInfo(): PlanInfo | null {
    return this.planInfoSubject.value;
  }

  esPremium(): boolean {
    const plan = this.planInfoSubject.value;
    return plan?.plan?.nombre === 'premium' || plan?.suscripcion_activa === true;
  }

  getLimiteTecnicos(): number {
    return this.planInfoSubject.value?.limite_tecnicos || 2;
  }

  getTecnicosActuales(): number {
    return this.planInfoSubject.value?.tecnicos_actuales || 0;
  }

  puedeAgregarTecnico(): boolean {
    const info = this.planInfoSubject.value;
    if (!info) return true;
    return info.puede_agregar_tecnico;
  }

  getLimiteIncidentesMensual(): number {
    return this.planInfoSubject.value?.limite_incidentes_mensual || 10;
  }

  getIncidentesMesActual(): number {
    return this.planInfoSubject.value?.incidentes_mes_actual || 0;
  }

  puedeReportarIncidente(): boolean {
    const info = this.planInfoSubject.value;
    if (!info) return true;
    return info.puede_reportar_incidente;
  }

  getPorcentajeIncidentes(): number {
    const info = this.planInfoSubject.value;
    if (!info) return 0;
    const porcentaje = (info.incidentes_mes_actual / info.limite_incidentes_mensual) * 100;
    return Math.min(porcentaje, 100);
  }

  getPorcentajeTecnicos(): number {
    const info = this.planInfoSubject.value;
    if (!info) return 0;
    const porcentaje = (info.tecnicos_actuales / info.limite_tecnicos) * 100;
    return Math.min(porcentaje, 100);
  }

  getNombrePlan(): string {
    const info = this.planInfoSubject.value;
    if (!info) return 'Gratuito';
    if (info.plan?.nombre === 'premium') return 'Premium';
    return 'Gratuito';
  }
}