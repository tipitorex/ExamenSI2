import json
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ItemCotizacionVehiculo(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    precio: float = Field(gt=0)


class CotizacionVehiculoResponder(BaseModel):
    items: list[ItemCotizacionVehiculo] = Field(min_length=1)
    descripcion: str = Field(min_length=5, max_length=1000)
    tiempo_horas: float = Field(gt=0)


class TallerInfoCV(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class ClienteInfoCV(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre_completo: str
    telefono: Optional[str] = None


class CotizacionVehiculoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    taller_id: int
    descripcion: str
    imagen_url: Optional[str] = None
    estado: str

    respuesta_items_json: Optional[str] = None
    respuesta_items: Optional[list[dict]] = None
    respuesta_monto: Optional[float] = None
    respuesta_descripcion: Optional[str] = None
    respuesta_tiempo_horas: Optional[float] = None

    creado_en: datetime
    respondido_en: Optional[datetime] = None

    taller: Optional[TallerInfoCV] = None
    cliente: Optional[ClienteInfoCV] = None

    @model_validator(mode="after")
    def parsear_items(self) -> "CotizacionVehiculoOut":
        if self.respuesta_items_json:
            try:
                self.respuesta_items = json.loads(self.respuesta_items_json)
            except (json.JSONDecodeError, TypeError):
                self.respuesta_items = []
        return self
