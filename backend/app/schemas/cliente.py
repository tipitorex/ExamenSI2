from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ClienteCrear(BaseModel):
    nombre_completo: str
    email: EmailStr
    telefono: str | None = None
    contrasena: str


class ClienteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_completo: str
    email: EmailStr
    telefono: str | None
    rol: str
    activo: bool
    creado_en: datetime