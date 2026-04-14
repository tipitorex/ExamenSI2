from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TecnicoCrear(BaseModel):
    nombre_completo: str = Field(min_length=2, max_length=150)
    telefono: str | None = Field(default=None, max_length=30)
    especialidad: str | None = Field(default=None, max_length=120)


class TecnicoActualizar(BaseModel):
    nombre_completo: str | None = Field(default=None, min_length=2, max_length=150)
    telefono: str | None = Field(default=None, max_length=30)
    especialidad: str | None = Field(default=None, max_length=120)
    activo: bool | None = None


class TecnicoDisponibilidadActualizar(BaseModel):
    disponible: bool


class TecnicoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    taller_id: int
    nombre_completo: str
    telefono: str | None
    especialidad: str | None
    disponible: bool
    activo: bool
    creado_en: datetime