from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SuperAdminInicioSesion(BaseModel):
    email: EmailStr
    contrasena: str


class UsuarioPlataformaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: EmailStr
    rol: str
    activo: bool
    creado_en: datetime


class SuperAdminTokenRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str
    usuario: UsuarioPlataformaRespuesta


class TenantAdminRespuesta(BaseModel):
    id: int
    nombre: str
    slug: str
    schema_name: str
    estado: str
    activo: bool
    plan_actual: str | None
    creado_en: datetime


class TenantCambiarPlanRequest(BaseModel):
    plan_codigo: str = Field(pattern="^(free|pro)$")


class TenantCambiarEstadoRequest(BaseModel):
    estado: str = Field(pattern="^(activo|suspendido|inactivo)$")
    activo: bool
