# backend/app/api/v1/endpoints/analitica.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from app.api import deps
from app.services.analitica_service import AnaliticaService
from app.schemas.analitica import DashboardAnaliticaResponse
from app.models.super_admin import SuperAdmin

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard", response_model=DashboardAnaliticaResponse)
async def get_dashboard_analitica(
    db: Session = Depends(deps.get_db),
    fecha_inicio: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[datetime] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    current_admin: SuperAdmin = Depends(deps.obtener_super_admin_actual)
):
    """
    Obtiene dashboard completo de analítica operacional
    Solo accesible para Super Administradores
    """
    try:
        logger.info(f"📊 Calculando dashboard analítico desde {fecha_inicio} a {fecha_fin}")
        dashboard_data = AnaliticaService.obtener_dashboard_completo(
            db=db,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )
        logger.info("✅ Dashboard calculado exitosamente")
        return dashboard_data
    except Exception as e:
        logger.error(f"❌ Error al obtener analítica: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al obtener analítica: {str(e)}")

@router.get("/kpis/tiempos")
async def get_kpis_tiempos(
    db: Session = Depends(deps.get_db),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    current_admin: SuperAdmin = Depends(deps.obtener_super_admin_actual)
):
    """Obtiene solo los KPIs de tiempos"""
    return AnaliticaService.calcular_kpi_asignacion(db, fecha_inicio, fecha_fin)

@router.get("/talleres/ranking")
async def get_ranking_talleres(
    db: Session = Depends(deps.get_db),
    limit: int = Query(10, ge=1, le=50),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    current_admin: SuperAdmin = Depends(deps.obtener_super_admin_actual)
):
    """Obtiene ranking de talleres más eficientes"""
    return AnaliticaService.obtener_talleres_eficientes(db, limit, fecha_inicio, fecha_fin)