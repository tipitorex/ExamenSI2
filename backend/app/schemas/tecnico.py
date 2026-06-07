from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class TecnicoCrear(BaseModel):
    nombre_completo: str = Field(min_length=2, max_length=150)
    email: EmailStr
    contrasena: str = Field(min_length=6, max_length=72)
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
    email: str | None = None
    especialidad: str | None
    disponible: bool
    activo: bool
    creado_en: datetime


class TecnicoInicioSesion(BaseModel):
    email: EmailStr
    contrasena: str


class TecnicoTokenRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str
    tecnico: TecnicoRespuesta