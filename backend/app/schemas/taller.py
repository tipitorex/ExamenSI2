from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TallerCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=30)
    direccion: str | None = Field(default=None, max_length=255)
    servicios: list[str] = Field(default_factory=list)
    contrasena: str = Field(min_length=6, max_length=72)


class TallerInicioSesion(BaseModel):
    email: EmailStr
    contrasena: str


class TallerRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: EmailStr
    telefono: str | None
    direccion: str | None
    servicios: list[str]
    activo: bool
    creado_en: datetime


class TallerTokenRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str
    taller: TallerRespuesta