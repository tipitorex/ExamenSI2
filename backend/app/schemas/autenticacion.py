from pydantic import BaseModel, EmailStr

from app.schemas.cliente import ClienteRespuesta


class SolicitudInicioSesion(BaseModel):
    tenant_slug: str
    email: EmailStr
    contrasena: str


class RespuestaToken(BaseModel):
    token_acceso: str
    tipo_token: str
    tenant_slug: str
    tenant_schema: str
    cliente: ClienteRespuesta