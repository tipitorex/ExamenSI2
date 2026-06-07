# backend/app/schemas/analitica.py
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class TipoIncidente(str, Enum):
    BATERIA = "bateria"
    LLANTA = "llanta"
    MOTOR = "motor"
    CHOQUE = "choque"
    OTROS = "otros"

class KPIAsignacion(BaseModel):
    tiempo_promedio_asignacion_minutos: float
    tiempo_promedio_llegada_minutos: float
    total_incidentes_periodo: int
    incidentes_resueltos: int
    porcentaje_resolucion: float

class IncidentesPorTipo(BaseModel):
    tipo: TipoIncidente
    cantidad: int
    porcentaje: float

class EficienciaTaller(BaseModel):
    taller_id: int
    nombre_taller: str
    telefono: Optional[str]
    tiempo_promedio_respuesta_minutos: float
    tiempo_promedio_finalizacion_minutos: float
    incidentes_atendidos: int
    calificacion_promedio: Optional[float]
    score_eficiencia: float  # Score combinado


class IncidentesPorUbicacion(BaseModel):
    latitud: float
    longitud: float
    cantidad: int
    ciudad: Optional[str]
    tipo_incidente: Optional[str]

class CasosCancelados(BaseModel):
    total_cancelados: int
    porcentaje_cancelacion: float
    motivos_cancelacion: Dict[str, int]  # Motivo -> cantidad
    cancelados_por_estado: Dict[str, int]  # no_atendido, cancelado_cliente, etc.
    tendencia_mensual: List[Dict]  # meses con cantidad

class CumplimientoSLA(BaseModel):
    nivel_cumplimiento_porcentaje: float
    incidentes_dentro_sla: int
    incidentes_fuera_sla: int
    tiempo_promedio_respuesta_sla_minutos: int
    tiempo_sla_esperado_minutos: int  # Ej: 30 minutos
    distribucion_tiempos: List[Dict]  # Rangos de tiempo

class DashboardAnaliticaResponse(BaseModel):
    kpi_generales: KPIAsignacion
    incidentes_por_tipo: List[IncidentesPorTipo]
    talleres_top_eficientes: List[EficienciaTaller]
    tendencia_incidentes: List[Dict]
    distribucion_geografica: List[Dict]
    # 👇 Nuevos campos
    zonas_calientes: List[IncidentesPorUbicacion]
    casos_cancelados: CasosCancelados
    cumplimiento_sla: CumplimientoSLA