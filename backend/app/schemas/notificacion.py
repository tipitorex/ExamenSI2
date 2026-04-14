from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TipoNotificacionEnum(str, Enum):
    NUEVA_SOLICITUD = "nueva_solicitud"
    ASIGNACION_TALLER = "asignacion_taller"
    ACTUALIZACION_ESTADO = "actualizacion_estado"
    TALLER_ACEPTO = "taller_acepto"
    TALLER_RECHAZO = "taller_rechazo"
    TECNICO_EN_CAMINO = "tecnico_en_camino"


class NotificacionCrear(BaseModel):
    cliente_id: int | None = None
    taller_id: int | None = None
    incidente_id: int | None = None
    tipo: TipoNotificacionEnum
    titulo: str = Field(min_length=1, max_length=255)
    mensaje: str = Field(min_length=1, max_length=5000)
    datos_extra_json: str | None = Field(default=None, max_length=5000)


class NotificacionMarcarLeida(BaseModel):
    leido: bool


class NotificacionRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int | None
    taller_id: int | None
    incidente_id: int | None
    tipo: TipoNotificacionEnum
    titulo: str
    mensaje: str
    leido: bool
    fecha_envio: datetime
    datos_extra_json: str | None
