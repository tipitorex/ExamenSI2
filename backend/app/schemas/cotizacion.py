import json
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TallerResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class ItemServicio(BaseModel):
    """Un ítem individual dentro de una cotización."""
    nombre: str = Field(min_length=1, max_length=200)
    precio: float = Field(gt=0, description="Precio unitario del ítem")


class CotizacionCrear(BaseModel):
    incidente_id: int
    items: list[ItemServicio] = Field(min_length=1, description="Lista de servicios a cobrar")
    tiempo_estimado_reparacion_horas: float = Field(gt=0, description="Tiempo estimado en horas (ej: 1.5 = 1h 30min)")
    notas: Optional[str] = Field(default=None, max_length=500)

    @property
    def monto_total(self) -> float:
        return round(sum(item.precio for item in self.items), 2)

    @property
    def tiempo_en_minutos(self) -> int:
        return round(self.tiempo_estimado_reparacion_horas * 60)

    @property
    def detalles_json(self) -> str:
        return json.dumps([item.model_dump() for item in self.items])


class CotizacionRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    taller_id: int
    monto_total: float
    tiempo_estimado_reparacion_minutos: int
    detalles_servicio: Optional[str] = None
    notas: Optional[str] = None
    estado: str
    creado_en: datetime
    taller: Optional[TallerResumen] = None

    # Campos calculados expuestos al cliente
    tiempo_estimado_reparacion_horas: Optional[float] = None
    items: Optional[list[dict]] = None

    @model_validator(mode="after")
    def calcular_campos(self) -> "CotizacionRespuesta":
        # Convertir minutos → horas para la UI
        if self.tiempo_estimado_reparacion_minutos:
            self.tiempo_estimado_reparacion_horas = round(
                self.tiempo_estimado_reparacion_minutos / 60, 2
            )
        # Parsear detalles_servicio JSON → items
        if self.detalles_servicio:
            try:
                self.items = json.loads(self.detalles_servicio)
            except (json.JSONDecodeError, TypeError):
                self.items = []
        return self


class TallerServicioCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio_base: Optional[float] = Field(default=None, gt=0)
    tiempo_estimado_minutos: Optional[int] = Field(default=None, gt=0)


class TallerServicioActualizar(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio_base: Optional[float] = Field(default=None, gt=0)
    tiempo_estimado_minutos: Optional[int] = Field(default=None, gt=0)


class TallerServicioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    taller_id: int
    nombre: str
    descripcion: Optional[str] = None
    precio_base: Optional[float] = None
    tiempo_estimado_minutos: Optional[int] = None
