from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EstadoIncidente = Literal["pendiente", "en_proceso", "atendido", "cerrado", "cancelado"]
PrioridadIncidente = Literal["baja", "media", "alta"]


class IncidenteCrear(BaseModel):
    vehiculo_id: int
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    descripcion: str = Field(min_length=5, max_length=2000)
    prioridad: PrioridadIncidente = "media"


class IncidenteActualizarEstado(BaseModel):
    estado_nuevo: EstadoIncidente
    observacion: str | None = Field(default=None, max_length=1000)


class HistorialEstadoIncidenteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    estado_anterior: str | None
    estado_nuevo: str
    observacion: str | None
    creado_en: datetime


class IncidenteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    vehiculo_id: int
    latitud: float
    longitud: float
    descripcion: str
    prioridad: str
    estado: str
    creado_en: datetime
    actualizado_en: datetime


class IncidenteDetalleRespuesta(IncidenteRespuesta):
    historial_estados: list[HistorialEstadoIncidenteRespuesta]