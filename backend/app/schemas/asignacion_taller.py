from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.incidente import IncidenteRespuesta  # 👈 IMPORTAR


class AsignacionTallerCrear(BaseModel):
    taller_id: int
    tecnico_id: int | None = None
    tiempo_estimado_llegada_minutos: int | None = Field(default=None, gt=0, le=240)
    distancia_km: float | None = Field(default=None, gt=0)


class AsignacionTallerAceptarRechazar(BaseModel):
    es_aceptado: bool
    motivo_rechazo: str | None = Field(default=None, max_length=500)


class AsignacionTallerActualizar(BaseModel):
    tecnico_id: int | None = None
    tiempo_estimado_llegada_minutos: int | None = Field(default=None, gt=0, le=240)
    distancia_km: float | None = Field(default=None, gt=0)


class AsignacionTallerRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    taller_id: int
    tecnico_id: int | None
    tiempo_estimado_llegada_minutos: int | None
    distancia_km: float | None
    fecha_asignacion: datetime
    es_aceptado: bool
    motivo_rechazo: str | None
    incidente: Optional[IncidenteRespuesta] = None  # 👈 AGREGAR ESTA LÍNEA