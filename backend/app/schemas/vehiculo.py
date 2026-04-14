from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VehiculoCrear(BaseModel):
    placa: str = Field(min_length=3, max_length=20)
    marca: str = Field(min_length=1, max_length=80)
    modelo: str = Field(min_length=1, max_length=80)
    anio: int | None = Field(default=None, ge=1950, le=2100)
    color: str | None = Field(default=None, max_length=40)


class VehiculoActualizar(BaseModel):
    marca: str | None = Field(default=None, min_length=1, max_length=80)
    modelo: str | None = Field(default=None, min_length=1, max_length=80)
    anio: int | None = Field(default=None, ge=1950, le=2100)
    color: str | None = Field(default=None, max_length=40)


class VehiculoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    placa: str
    marca: str
    modelo: str
    anio: int | None
    color: str | None
    creado_en: datetime