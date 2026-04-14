from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class EstadoPagoEnum(str, Enum):
    PENDIENTE = "pendiente"
    COMPLETADO = "completado"
    FALLIDO = "fallido"
    REEMBOLSADO = "reembolsado"


class PagoCrear(BaseModel):
    monto: float = Field(gt=0)
    metodo_pago: str | None = Field(default=None, max_length=50)


class PagoActualizar(BaseModel):
    estado: EstadoPagoEnum | None = None
    metodo_pago: str | None = Field(default=None, max_length=50)
    referencia_pago: str | None = Field(default=None, max_length=255)


class PagoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    incidente_id: int
    monto: float
    comision_plataforma: float
    monto_para_taller: float
    estado: EstadoPagoEnum
    metodo_pago: str | None
    referencia_pago: str | None
    fecha_pago: datetime | None
    fecha_creacion: datetime
