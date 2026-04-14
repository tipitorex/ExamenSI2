from pydantic import BaseModel, EmailStr

from app.schemas.cliente import ClienteRespuesta


class SolicitudInicioSesion(BaseModel):
    email: EmailStr
    contrasena: str


class RespuestaToken(BaseModel):
    token_acceso: str
    tipo_token: str
    cliente: ClienteRespuesta