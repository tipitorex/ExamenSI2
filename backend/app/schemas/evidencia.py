from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TipoEvidenciaEnum(str, Enum):
    IMAGEN = "imagen"
    AUDIO = "audio"


class EvidenciaCrear(BaseModel):
    tipo: TipoEvidenciaEnum
    url_archivo: str = Field(min_length=1, max_length=500)
    transcripcion_texto: str | None = Field(default=None, max_length=5000)


class EvidenciaActualizar(BaseModel):
    transcripcion_texto: str | None = Field(default=None, max_length=5000)
    analisis_ia: str | None = Field(default=None, max_length=5000)


class EvidenciaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    tipo: TipoEvidenciaEnum
    url_archivo: str
    transcripcion_texto: str | None
    analisis_ia: str | None
    fecha_subida: datetime
